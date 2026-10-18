// pages/api/safedeal/index.ts
// Customer SafeDeal API — List customer cases (GET) & Submit new case (POST)

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, rateLimitApiWrite, setRateLimitHeaders } from '@/lib/rateLimit';
import SafeDealCase, { ISafeDealCaseDocument } from '@/models/SafeDeal';

const createCaseSchema = z.object({
  type: z.enum([
    'property_review',
    'project_review',
    'investment_consultation',
    'external_property_check',
    'seller_verification',
    'developer_check',
    'society_noc_check',
    'general_inquiry',
  ]),
  customer: z.object({
    name: z.string().min(2, 'Name is required').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(8, 'Phone number is required').max(20),
    preferredContactMethod: z.enum(['email', 'phone', 'whatsapp']).default('email'),
    whatsapp: z.string().optional(),
  }),
  reference: z
    .object({
      propertyId: z.string().optional(),
      propertySlug: z.string().optional(),
      projectId: z.string().optional(),
      projectSlug: z.string().optional(),
      agentId: z.string().optional(),
      agentSlug: z.string().optional(),
      developerId: z.string().optional(),
      developerSlug: z.string().optional(),
      societyId: z.string().optional(),
      societySlug: z.string().optional(),
      externalPropertyName: z.string().optional(),
      externalPropertyAddress: z.string().optional(),
      externalPropertyCity: z.string().optional(),
    })
    .optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  questions: z.array(z.string()).optional(),
  proposedInvestment: z
    .object({
      amount: z.number().positive().optional(),
      currency: z.string().default('PKR'),
      purpose: z.string().optional(),
    })
    .optional(),
  scopeAcknowledged: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge the service scope and limits',
  }),
});

function generateCaseNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SD-${dateStr}-${randomHex}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const rl = await rateLimitApi(req);
    setRateLimitHeaders(res, rl);
    const isAllowed = 'allowed' in rl ? rl.allowed : (rl as unknown as { success: boolean }).success;
    if (!isAllowed) {
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }

    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10)));
      const statusFilter = String(req.query.status || 'all');
      const searchQuery = String(req.query.search || '').trim();

      const userEmail = (auth.email || '').toLowerCase();
      const userId = auth.id;

      const query: Record<string, unknown> = {
        $or: [{ 'customer.userId': userId }, { 'customer.email': userEmail }],
      };

      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }

      if (searchQuery) {
        query.$and = [
          {
            $or: [
              { caseNumber: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { 'reference.externalPropertyName': { $regex: searchQuery, $options: 'i' } },
              { 'reference.propertyId': { $regex: searchQuery, $options: 'i' } },
              { 'reference.projectId': { $regex: searchQuery, $options: 'i' } },
            ],
          },
        ];
      }

      const total = await SafeDealCase.countDocuments(query);
      const totalPages = Math.ceil(total / limit) || 1;

      const rawCases = await SafeDealCase.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const cases = (rawCases as unknown as (ISafeDealCaseDocument & { _id: unknown })[]).map((c) => ({
        _id: String(c._id),
        caseNumber: c.caseNumber,
        type: c.type,
        status: c.status,
        priority: c.priority,
        source: c.source,
        customer: c.customer,
        reference: c.reference,
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return res.status(200).json({
        success: true,
        cases,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to fetch cases' });
    }
  }

  if (req.method === 'POST') {
    const rl = await rateLimitApiWrite(req);
    setRateLimitHeaders(res, rl);
    const isAllowed = 'allowed' in rl ? rl.allowed : (rl as unknown as { success: boolean }).success;
    if (!isAllowed) {
      return res.status(429).json({ success: false, error: 'Too many submissions. Please wait.' });
    }

    try {
      const token = await getToken({ req });
      const parseResult = createCaseSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const payload = parseResult.data;
      const caseNumber = generateCaseNumber();

      const newCaseData = {
        caseNumber,
        type: payload.type,
        status: 'submitted',
        priority: 'medium',
        source: 'web_portal',
        customer: {
          userId: token?.sub || null,
          name: payload.customer.name,
          email: payload.customer.email.toLowerCase(),
          phone: payload.customer.phone,
          preferredContactMethod: payload.customer.preferredContactMethod,
          whatsapp: payload.customer.whatsapp || undefined,
        },
        reference: payload.reference || {},
        description: payload.description,
        questions: payload.questions || [],
        proposedInvestment: payload.proposedInvestment || undefined,
        scopeAcknowledged: true,
        scopeAcknowledgedAt: new Date(),
        auditTrail: [
          {
            action: 'case_submitted',
            performedAt: new Date(),
            performedBy: {
              userId: token?.sub || undefined,
              name: payload.customer.name,
              role: token ? String(token.role || 'user') : 'guest',
            },
            note: 'Case submitted via web portal',
          },
        ],
      };

      const createdCase = await SafeDealCase.create(newCaseData);

      return res.status(201).json({
        success: true,
        caseNumber,
        caseId: String(createdCase._id),
        message: 'Your SafeDeal case has been created successfully.',
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to create case' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
}