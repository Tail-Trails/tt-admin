import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: { key: keyof T; label: string; editable?: boolean }[];
  idKey: keyof T;
  isLoading?: boolean;
  onUpdate?: (id: string, data: Partial<T>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  idKey,
  isLoading,
  onUpdate,
  onDelete,
}: DataTableProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<T>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (row: T) => {
    setEditingId(String(row[idKey]));
    setEditData(row);
  };

  const handleSave = async () => {
    if (!editingId || !onUpdate) return;
    setIsSaving(true);
    await onUpdate(editingId, editData);
    setIsSaving(false);
    setEditingId(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    if (confirm('Are you sure you want to delete this item?')) {
      await onDelete(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50">
            {columns.map((col) => (
              <TableHead key={String(col.key)} className="font-semibold">
                {col.label}
              </TableHead>
            ))}
            {(onUpdate || onDelete) && (
              <TableHead className="w-24">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const rowId = String(row[idKey]);
            const isEditing = editingId === rowId;

            return (
              <TableRow key={rowId} className="hover:bg-secondary/30">
                {columns.map((col) => (
                  <TableCell key={String(col.key)}>
                    {isEditing && col.editable ? (
                      <Input
                        value={String(editData[col.key] ?? '')}
                        onChange={(e) =>
                          setEditData({ ...editData, [col.key]: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-sm">
                        {formatValue(row[col.key])}
                      </span>
                    )}
                  </TableCell>
                ))}
                {(onUpdate || onDelete) && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-8 w-8 text-success hover:text-success"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCancel}
                            className="h-8 w-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {onUpdate && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(row)}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(rowId)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}
