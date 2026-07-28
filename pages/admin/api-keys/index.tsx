import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Key, Copy, Eye, EyeOff, Trash2, Plus, Calendar, User, Shield, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function ApiKeysPage() {
  const [showKey, setShowKey] = useState<number | null>(null);
  
  const apiKeys = [
    { id: 1, name: "Production API", key: "sk_live_1234567890abcdef", created: "2024-01-15", expires: "2025-01-15", usage: "1,245", status: "active" },
    { id: 2, name: "Development API", key: "sk_test_abcdef1234567890", created: "2024-01-10", expires: "2024-04-10", usage: "856", status: "active" },
    { id: 3, name: "Mobile App", key: "sk_app_7890abcdef123456", created: "2024-01-05", expires: "2024-07-05", usage: "423", status: "revoked" },
    { id: 4, name: "Partner Integration", key: "sk_partner_4567890abcdef123", created: "2024-01-01", expires: "2024-12-31", usage: "987", status: "active" },
  ];

  const stats = [
    { title: "Total Keys", value: "12", icon: <Key className="w-5 h-5" />, color: "blue" },
    { title: "Active", value: "9", icon: <Shield className="w-5 h-5" />, color: "green" },
    { title: "Expired", value: "2", icon: <Calendar className="w-5 h-5" />, color: "orange" },
    { title: "Revoked", value: "1", icon: <Trash2 className="w-5 h-5" />, color: "red" },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("API Key copied to clipboard!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
      case "revoked": return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Revoked</span>;
      case "expired": return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Expired</span>;
      default: return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Keys Management</h1>
            <p className="text-gray-600">Manage API keys for integrations and developers</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
                  <div className={`text-${stat.color}-600`}>{stat.icon}</div>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-gray-600 text-sm">{stat.title}</p>
            </Card>
          ))}
        </div>

        {/* API Keys Table */}
        <Card>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {apiKeys.map((apiKey) => (
                    <tr key={apiKey.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{apiKey.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                            {showKey === apiKey.id ? apiKey.key : "��������������������"}
                          </code>
                          <button
                            onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {showKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {apiKey.created}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{apiKey.expires}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{apiKey.usage} calls</td>
                      <td className="px-6 py-4">{getStatusBadge(apiKey.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1 text-blue-600 hover:text-blue-900">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Security Note */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-yellow-800">Security Guidelines</h3>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>� Never share API keys in public repositories or client-side code</li>
                    <li>� Rotate keys regularly (every 3-6 months)</li>
                    <li>� Use different keys for different environments (dev/staging/prod)</li>
                    <li>� Monitor usage for suspicious activity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
