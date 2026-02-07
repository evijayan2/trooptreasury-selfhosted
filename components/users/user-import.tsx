"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileDown, CheckCircle2, AlertCircle } from "lucide-react"
import { importUsers } from "@/app/actions"
import * as XLSX from 'xlsx'
import { toast } from "sonner"

interface UserImportProps {
    slug: string
}

export function UserImport({ slug }: UserImportProps) {
    const [open, setOpen] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setImportResult(null)

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws) as any[]

                // Map data to expected format
                const usersToImport = data.map(row => {
                    // Try to handle different casing for keys
                    const findKey = (candidates: string[]) => {
                        return Object.keys(row).find(k => candidates.includes(k.toLowerCase()))
                    }

                    const nameKey = findKey(['name', 'full name', 'user name', 'fullname'])
                    const emailKey = findKey(['email', 'emailid', 'email id', 'email_id'])
                    const roleKey = findKey(['role', 'user role', 'position'])
                    const passwordKey = findKey(['password', 'pass', 'pwd'])

                    return {
                        name: nameKey ? String(row[nameKey]) : '',
                        email: emailKey ? String(row[emailKey]) : '',
                        role: roleKey ? String(row[roleKey]) : 'SCOUT',
                        password: passwordKey ? String(row[passwordKey]) : undefined
                    }
                }).filter(u => u.email && u.name)

                if (usersToImport.length === 0) {
                    toast.error("No valid users found in file. Ensure 'Name' and 'Email' columns exist.")
                    setIsImporting(false)
                    return
                }

                const result = await importUsers(slug, usersToImport)

                if ('error' in result && result.error) {
                    toast.error(result.error)
                } else {
                    const res = result as any
                    setImportResult({
                        success: res.successCount || res.success || 0,
                        failed: res.failedCount || res.failed || 0,
                        errors: res.errors || []
                    })
                    toast.success(`Import complete: ${res.successCount || res.success || 0} succeeded`)
                }
            } catch (error) {
                console.error("Import error:", error)
                toast.error("Failed to parse file")
            } finally {
                setIsImporting(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    const downloadTemplate = () => {
        const template = [
            { "Name": "John Doe", "Email": "john@example.com", "Role": "LEADER", "Password": "OptionalPassword123!" },
            { "Name": "Jane Scout", "Email": "jane@example.com", "Role": "SCOUT", "Password": "" }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const csv = XLSX.utils.sheet_to_csv(ws)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", "user_import_template.csv")
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk User Import</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to import multiple users at once.
                    </DialogDescription>
                </DialogHeader>

                {!importResult ? (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <Label>Download Template</Label>
                            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                                <FileDown className="mr-2 h-4 w-4" />
                                template.csv
                            </Button>
                        </div>

                        <div className="grid w-full items-center gap-1.5 pt-4">
                            <Label htmlFor="file-upload">Step 1: Upload File</Label>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileUpload}
                                disabled={isImporting}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Supported formats: .csv, .xlsx, .xls. Mandatory columns: Name, Email.
                            </p>
                        </div>

                        {isImporting && (
                            <div className="flex items-center justify-center p-4">
                                <span className="animate-spin mr-2">⏳</span>
                                Processing users...
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            Import Completed
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100 dark:bg-green-900/10 dark:border-green-900/20">
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{importResult.success}</div>
                                <div className="text-sm text-green-600 dark:text-green-500">Successfully Imported</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">
                                <div className="text-2xl font-bold text-red-700 dark:text-red-400">{importResult.failed}</div>
                                <div className="text-sm text-red-600 dark:text-red-500">Failed / Skipped</div>
                            </div>
                        </div>

                        {importResult.errors.length > 0 && (
                            <div className="mt-4">
                                <Label className="text-red-600 flex items-center gap-1 mb-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Errors
                                </Label>
                                <div className="max-h-[150px] overflow-y-auto text-xs space-y-1 border rounded p-2 bg-muted/50">
                                    {importResult.errors.map((err, i) => (
                                        <div key={i} className="text-red-500">• {err}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {importResult ? (
                        <Button onClick={() => {
                            setOpen(false)
                            setImportResult(null)
                        }}>Done</Button>
                    ) : (
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
