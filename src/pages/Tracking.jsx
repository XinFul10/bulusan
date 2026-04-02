import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { documentService } from '../services/transactionService'

const DESTINATION_OPTIONS = [
  'Office of the Mayor',
  'Office of the Planetary Office',
  'HR',
  'Budget Office'
]

const Tracking = () => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const totalCount = documents.length
  const verifiedCount = useMemo(
    () => documents.filter((d) => Boolean(d.manuallyDelivered)).length,
    [documents]
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await documentService.getAll()
        setDocuments(response.data || [])
      } catch (e) {
        toast.error('Failed to load tracked documents')
      } finally {
        setLoading(false)
      }
    }

    load()

    const handleRefresh = () => load()
    window.addEventListener('refreshData', handleRefresh)
    return () => window.removeEventListener('refreshData', handleRefresh)
  }, [])

  const updateDocument = async (id, patch) => {
    const previous = documents
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)))

    try {
      const response = await documentService.update(id, patch)
      if (response?.data) {
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? response.data : doc)))
      }
    } catch (e) {
      setDocuments(previous)
      toast.error('Failed to update document')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
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
