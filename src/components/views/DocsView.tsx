import { useState, useRef } from "react";
import { Search, FolderOpen, Plus, Upload, Check, X, Trash2, Eye, ClipboardList, FileText, FileSignature, IdCard, BookOpen, Folder, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDockVisibility } from "@/hooks/useDockVisibility";

const filters = [
  { label: "Todos", icon: ClipboardList, color: "text-warning" },
  { label: "Conta", icon: FileText, color: "text-muted-foreground" },
  { label: "Contrato", icon: FileSignature, color: "text-amber-600" },
  { label: "Documento", icon: IdCard, color: "text-primary" },
  { label: "Manual", icon: BookOpen, color: "text-primary" },
  { label: "Outros", icon: Folder, color: "text-warning" },
];

const categories = ["Conta", "Contrato", "Documento", "Manual", "Outros"];

type Doc = {
  id: string;
  name: string;
  category: string;
  tags: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: string;
};

const STORAGE_KEY = "sparky-docs";

const loadDocs = (): Doc[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const saveDocs = (docs: Doc[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));

const DocsView = () => {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Documento");
  const [docName, setDocName] = useState("");
  const [docTags, setDocTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<Doc[]>(loadDocs);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  useDockVisibility(uploadOpen || previewUrl !== null || deleteConfirmId !== null);

  const filteredDocs = docs.filter(d => {
    const matchCat = activeFilter === "Todos" || d.category === activeFilter;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.tags.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setSelectedFiles(prev => [...prev, ...Array.from(files)]);
  };

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setSelectedFiles(prev => [...prev, ...Array.from(files)]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (selectedFiles.length === 0 || !docName.trim() || saving) return;
    setSaving(true);
    let processed = 0;
    const newDocs: Doc[] = [];

    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        // Check for duplicates
        const isDuplicate = docs.some(d => d.fileName === file.name && d.name === docName.trim());
        if (!isDuplicate) {
          newDocs.push({
            id: crypto.randomUUID(),
            name: docName.trim(),
            category: selectedCategory,
            tags: docTags,
            fileUrl: reader.result as string,
            fileName: file.name,
            fileType: file.type,
            createdAt: new Date().toISOString(),
          });
        }
        processed++;
        if (processed === selectedFiles.length) {
          if (newDocs.length > 0) {
            const updated = [...newDocs, ...docs];
            setDocs(updated);
            saveDocs(updated);
            toast.success(`${newDocs.length} documento${newDocs.length > 1 ? "s" : ""} salvo${newDocs.length > 1 ? "s" : ""} com sucesso! 📄`);
          } else {
            toast.info("Documentos já existentes, nenhum duplicado salvo.");
          }
          resetForm();
          setSaving(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const resetForm = () => {
    setUploadOpen(false);
    setDocName("");
    setDocTags("");
    setSelectedFiles([]);
    setSelectedCategory("Documento");
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const deleteDoc = (id: string) => {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    saveDocs(updated);
    setDeleteConfirmId(null);
    toast.success("Documento removido com sucesso");
  };

  const openUploadForCategory = (cat: string) => {
    setSelectedCategory(cat === "Todos" ? "Documento" : cat);
    setUploadOpen(true);
  };

  const getCategoryIcon = (cat: string) => {
    const f = filters.find(f => f.label === cat);
    if (!f) return FileText;
    return f.icon;
  };

  return (
    <>
      <div className="px-4 pb-24 space-y-4">
        <div className="pt-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Documentos</h1>
          <button onClick={() => setUploadOpen(true)}
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground active:scale-95 transition-all">
            <Plus size={16} />
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar documentos..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 pl-9 pr-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary transition-all" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => {
            const Icon = f.icon;
            const count = f.label === "Todos" ? docs.length : docs.filter(d => d.category === f.label).length;
            return (
              <button key={f.label} onClick={() => setActiveFilter(f.label)}
                className={cn("flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95",
                  activeFilter === f.label ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground border border-border")}>
                <span className="flex items-center gap-1.5">
                  <Icon size={14} className={activeFilter === f.label ? "text-primary-foreground" : f.color} />
                  {f.label}
                  {count > 0 && <span className="text-[9px] opacity-70">({count})</span>}
                </span>
              </button>
            );
          })}
        </div>

        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 fade-in-up">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
              <FolderOpen size={32} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Nenhum documento</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              {activeFilter === "Todos" ? "Seus documentos aparecerão aqui" : `Nenhum documento em "${activeFilter}"`}
            </p>
            <button onClick={() => openUploadForCategory(activeFilter)}
              className="rounded-xl border border-border px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all flex items-center gap-2">
              <Plus size={14} /> Adicionar {activeFilter === "Todos" ? "Documento" : activeFilter}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const CatIcon = getCategoryIcon(doc.category);
              const catFilter = filters.find(f => f.label === doc.category);
              return (
                <div key={doc.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", "bg-muted/50")}>
                    <CatIcon size={18} className={catFilter?.color || "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.category} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.fileType.startsWith("image/") && (
                      <button onClick={() => setPreviewUrl(doc.fileUrl)} className="p-1.5 rounded-full hover:bg-muted active:scale-95">
                        <Eye size={14} className="text-muted-foreground" />
                      </button>
                    )}
                    <a href={doc.fileUrl} download={doc.fileName} className="p-1.5 rounded-full hover:bg-muted active:scale-95">
                      <Upload size={14} className="text-muted-foreground rotate-180" />
                    </a>
                    <button onClick={() => confirmDelete(doc.id)} className="p-1.5 rounded-full hover:bg-destructive/15 active:scale-95">
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl bg-card border-t border-border p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Novo Documento</h2>
              <button onClick={resetForm} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all">
                <X size={20} />
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileSelect} className="hidden" />
            <input ref={addFileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleAddMoreFiles} className="hidden" multiple />

            <div onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 py-8 mb-3 cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.99]">
              {selectedFiles.length > 0 ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 mb-3">
                    <Check size={20} className="text-success" />
                  </div>
                  <p className="text-sm font-medium">{selectedFiles.length} arquivo{selectedFiles.length > 1 ? "s" : ""} selecionado{selectedFiles.length > 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Clique para trocar</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 mb-3">
                    <Upload size={20} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium">Clique para enviar</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PDF, Imagem ou Documento</p>
                </>
              )}
            </div>

            {/* File list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                    <FileText size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-xs truncate flex-1">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-destructive active:scale-95"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Add more files */}
            <button onClick={() => addFileInputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mb-5">
              <Plus size={14} /> Adicionar mais arquivos
            </button>

            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-3">INFORMAÇÕES BÁSICAS</p>
            <div className="space-y-3 mb-5">
              <input type="text" placeholder="Nome do documento" value={docName} onChange={(e) => setDocName(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary transition-all" />
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95",
                        selectedCategory === cat ? "bg-primary/15 text-primary border border-primary" : "bg-muted/50 text-muted-foreground border border-border")}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-3">TAGS</p>
            <input type="text" placeholder="Adicionar tags separadas por vírgula" value={docTags}
              onChange={(e) => setDocTags(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary transition-all mb-5" />

            <div className="flex gap-3">
              <button onClick={resetForm}
                className="flex-1 rounded-xl border border-border py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={selectedFiles.length === 0 || !docName.trim() || saving}
                className={cn("flex-1 rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                  selectedFiles.length > 0 && docName.trim() && !saving ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Check size={16} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-[85%] max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <h3 className="text-base font-bold">Excluir documento?</h3>
            </div>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground active:scale-[0.97]">Cancelar</button>
              <button onClick={() => deleteDoc(deleteConfirmId)} className="flex-1 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground active:scale-[0.97]">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setPreviewUrl(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative max-w-[90vw] max-h-[80vh]">
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-3 -right-3 bg-card rounded-full p-1.5 shadow-lg z-10">
              <X size={16} />
            </button>
            <img loading="lazy" decoding="async" src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
};

export default DocsView;
