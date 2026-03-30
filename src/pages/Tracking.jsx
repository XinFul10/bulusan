import { useEffect, useMemo, useState } from 'react'

const DESTINATION_OPTIONS = [
  'Office of the Mayor',
  'Office of the Planetary Office',
  'HR',
  'Budget Office'
]

const STORAGE_KEY = 'tracked_documents_v1'

const getInitialDocuments = () => ([
  {
    id: 'DOC-001',
    uploaderName: 'Maria Santos',
    description: 'Signed budget endorsement letter (Q1)',
    destination: 'Office of the Mayor',
    manuallyDelivered: false
  },
  {
    id: 'DOC-002',
    uploaderName: 'Juan Dela Cruz',
    description: 'HR clearance & appointment papers',
    destination: 'HR',
    manuallyDelivered: true
  },
  {
    id: 'DOC-003',
    uploaderName: 'Aileen Reyes',
    description: 'Supplemental budget request documents',
    destination: 'Budget Office',
    manuallyDelivered: false
  }
])

const Tracking = () => {
  const [documents, setDocuments] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return getInitialDocuments()
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : getInitialDocuments()
    } catch {
      return getInitialDocuments()
    }
  })

  const totalCount = documents.length
  const verifiedCount = useMemo(
    () => documents.filter((d) => Boolean(d.manuallyDelivered)).length,
    [documents]
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
    } catch {
      // ignore persistence failures (e.g., storage disabled)
    }
  }, [documents])

  const updateDocument = (id, patch) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Document Tracking</h1>
          <p className="text-sm text-text-light mt-1">
            {verifiedCount} of {totalCount} verified for manual delivery
          </p>
        </div>
      </div>

      {/* Tracking Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="table-header">Uploader Name</th>
                <th scope="col" className="table-header">Document Description</th>
                <th scope="col" className="table-header">Document Destination</th>
                <th scope="col" className="table-header">Manual Delivery Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-card">
              {documents.map((doc, idx) => (
                <tr key={doc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="table-cell font-medium">{doc.uploaderName}</td>
                  <td className="table-cell">
                    <span className="block max-w-[34rem] truncate" title={doc.description}>
                      {doc.description}
                    </span>
                  </td>
                  <td className="table-cell">
                    <label className="sr-only" htmlFor={`destination-${doc.id}`}>
                      Destination for {doc.uploaderName}
                    </label>
                    <select
                      id={`destination-${doc.id}`}
                      className="input-field max-w-xs"
                      value={doc.destination}
                      onChange={(e) => updateDocument(doc.id, { destination: e.target.value })}
                    >
                      {DESTINATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <input
                        id={`delivered-${doc.id}`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary-light"
                        checked={Boolean(doc.manuallyDelivered)}
                        onChange={(e) => updateDocument(doc.id, { manuallyDelivered: e.target.checked })}
                      />
                      <label
                        htmlFor={`delivered-${doc.id}`}
                        className="text-sm text-text-dark select-none"
                      >
                        Verified
                      </label>
                    </div>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td className="table-cell text-text-light" colSpan={4}>
                    No tracked documents yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Tracking
