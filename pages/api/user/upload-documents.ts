// pages/api/user/upload-documents.ts

import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";

export const config = { api: { bodyParser: false } };

// Helper to get field value from formidable
const getFieldValue = (field: any): string => {
  if (Array.isArray(field)) {
    return field[0]?.toString() || "";
  }
  return field?.toString() || "";
};

// Helper to get single file
const getFile = (files: any, key: string): formidable.File | null => {
  const file = files[key];
  if (!file) return null;
  return Array.isArray(file) ? file[0] : file;
};

const uploadToCloudinary = async (file: formidable.File, folder: string) => {
  const result = await cloudinary.uploader.upload(file.filepath, {
    folder: `highrise/${folder}`,
    resource_type: "auto",
  });
  return result.secure_url;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const form = formidable({ multiples: true });
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Get email from form data
    const email = getFieldValue(fields.email);

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updates: any = {};
    let hasUploads = false;

    // 1. Profile Picture
    const profilePic = getFile(files, "profilePicture");
    if (profilePic) {
      updates.profilePictureUrl = await uploadToCloudinary(profilePic, "profile");
      hasUploads = true;
    }

    // 2. CNIC Uploads (Front & Back) - Only allowed if NOT verified yet
    if (user.cnicVerified) {
        // If user tries to upload CNIC but is already verified -> Block it
        if (getFile(files, "cnicFront") || getFile(files, "cnicBack")) {
            return res.status(403).json({
                success: false,
                message: "Identity is already verified. Cannot change CNIC documents.",
            });
        }
    } else {
        // Allow CNIC uploads
        const cnicFront = getFile(files, "cnicFront");
        if (cnicFront) {
            updates.cnicFrontUrl = await uploadToCloudinary(cnicFront, "cnic");
            hasUploads = true;
        }

        const cnicBack = getFile(files, "cnicBack");
        if (cnicBack) {
            updates.cnicBackUrl = await uploadToCloudinary(cnicBack, "cnic");
            hasUploads = true;
        }
    }

    // 3. Professional Documents
    const licenseFile = getFile(files, "licenseFile");
    if (licenseFile) {
      updates.licenseFileUrl = await uploadToCloudinary(licenseFile, "license");
      hasUploads = true;
    }

    const companyProofFile = getFile(files, "companyProofFile") || getFile(files, "companyRegFile");
    if (companyProofFile) {
      updates.companyProofUrl = await uploadToCloudinary(companyProofFile, "company_proof");
      hasUploads = true;
    }

    const ntnCertFile = getFile(files, "ntnCertFile");
    if (ntnCertFile) {
      updates.ntnCertUrl = await uploadToCloudinary(ntnCertFile, "company_proof");
      hasUploads = true;
    }

    if (!hasUploads) {
      return res.status(400).json({ success: false, message: "No valid files uploaded" });
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(user._id, updates, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Failed to update user" });
    }

    // Return full user object
    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully!",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        city: updatedUser.city,
        country: updatedUser.country,
        cnic: updatedUser.cnic,
        cnicName: updatedUser.cnicName,
        cnicVerified: updatedUser.cnicVerified,
        profession: updatedUser.profession,
        companyName: updatedUser.companyName,
        licenseNumber: updatedUser.licenseNumber,
        ntnNumber: updatedUser.ntnNumber,
        officeAddress: updatedUser.officeAddress,
        homeAddress: updatedUser.homeAddress,
        
        // URLs
        profilePictureUrl: updatedUser.profilePictureUrl,
        cnicFrontUrl: updatedUser.cnicFrontUrl,
        cnicBackUrl: updatedUser.cnicBackUrl,
        licenseFileUrl: updatedUser.licenseFileUrl,
        companyProofUrl: updatedUser.companyProofUrl,
        ntnCertUrl: updatedUser.ntnCertUrl,
        
        accountType: updatedUser.accountType,
        role: updatedUser.role
      },
    });

  } catch (error: any) {
    console.error("Upload documents error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload documents",
    });
  }
}
