// utils/csvExport.ts
// Reusable CSV Export Utility

/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without .csv extension)
 * @param columns - Optional: Specify which columns to export and their display names
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No data to export!')
    return
  }

  let headers: string[]
  let dataKeys: string[]

  if (columns) {
    // Use specified columns
    headers = columns.map(col => col.label)
    dataKeys = columns.map(col => col.key)
  } else {
    // Auto-detect columns from first row
    dataKeys = Object.keys(data[0])
    headers = dataKeys.map(key => 
      // Convert camelCase to Title Case
      key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    )
  }

  // Create CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      dataKeys.map(key => {
        const value = row[key]
        
        // Handle different data types
        if (value === null || value === undefined) {
          return ''
        }
        
        // Convert numbers
        if (typeof value === 'number') {
          return value
        }
        
        // Escape and quote strings
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`
        }
        
        // Convert other types to string
        return `"${String(value)}"`
      }).join(',')
    )
  ]

  const csvContent = csvRows.join('\n')

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  // Add date to filename
  const date = new Date().toISOString().split('T')[0]
  const fullFilename = `${filename}_${date}.csv`
  
  link.setAttribute('href', url)
  link.setAttribute('download', fullFilename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format number to 2 decimal places
 */
export function formatNumber(value: any, decimals: number = 2): number | string {
  if (value === undefined || value === null || value === '') return 0
  const num = parseFloat(value)
  if (isNaN(num)) return 0
  return parseFloat(num.toFixed(decimals))
}

/**
 * Format percentage (0.1234 -> 12.34)
 */
export function formatPercentage(value: any, decimals: number = 2): number | string {
  const num = formatNumber(value, decimals + 2)
  if (typeof num === 'number') {
    return parseFloat((num * 100).toFixed(decimals))
  }
  return 0
}