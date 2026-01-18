"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button, Input, Dialog, MarkdownEditor } from "@/components/ui";
import { useRouter, useParams } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";

interface Document {
  id: string;
  kbId: string;
  title: string;
  content?: string;
  wordCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
}

type DialogType = "create" | "edit" | "delete" | "preview" | null;

export default function DocumentsPage() {
  const { t } = useI18n();
  const { user: authUser, isLoading: authLoading, hasPermission } = useAuth();
  const router = useRouter();
  const params = useParams();
  const kbId = params.id as string;
  
  const canListDocs = hasPermission(PERMISSIONS.DOCS_LIST);
  const canCreateDoc = hasPermission(PERMISSIONS.DOCS_CREATE);
  const canUpdateDoc = hasPermission(PERMISSIONS.DOCS_UPDATE);
  const canDeleteDoc = hasPermission(PERMISSIONS.DOCS_DELETE);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [formError, setFormError] = useState("");

  const currentUserId = authUser?.id;

  const fetchKnowledgeBase = useCallback(async () => {
    if (!currentUserId || !kbId) return;
    
    try {
      const params = new URLSearchParams({
        operatorId: currentUserId,
      });
      
      const response = await fetch(`/api/kb?${params}`);
      const result = await response.json();
      
      if (result.knowledgeBases) {
        const kb = result.knowledgeBases.find((kb: KnowledgeBase) => kb.id === kbId);
        if (kb) {
          setKnowledgeBase(kb);
        }
      }
    } catch (error) {
      console.error("Failed to fetch knowledge base:", error);
    }
  }, [currentUserId, kbId]);

  const fetchDocuments = useCallback(async () => {
    if (!currentUserId || !canListDocs || !kbId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        operatorId: currentUserId,
        kbId: kbId,
      });
      if (search) {
        params.append("search", search);
      }
      
      const response = await fetch(`/api/documents?${params}`);
      const result = await response.json();
      
      if (result.documents) {
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, kbId, search, canListDocs]);

  useEffect(() => {
    fetchKnowledgeBase();
    fetchDocuments();
  }, [fetchKnowledgeBase, fetchDocuments]);
  
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push("/login");
    }
  }, [authLoading, authUser, router]);
  
  if (!authLoading && authUser && !canListDocs) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <h2 className="font-mono text-lg font-medium text-red-500">{t("error.accessDenied")}</h2>
          <p className="mt-2 font-mono text-sm text-muted">{t("error.noPermission")}</p>
        </div>
      </div>
    );
  }

  const openCreateDialog = () => {
    setFormData({
      title: "",
      content: "",
    });
    setFormError("");
    setDialogType("create");
  };

  const openEditDialog = async (doc: Document) => {
    setSelectedDoc(doc);
    setFormData({
      title: doc.title,
      content: "",
    });
    setFormError("");
    setDialogType("edit");
    
    if (currentUserId) {
      try {
        const params = new URLSearchParams({
          operatorId: currentUserId,
          docId: doc.id,
        });
        const response = await fetch(`/api/documents?${params}`);
        const result = await response.json();
        if (result.document) {
          setFormData({
            title: result.document.title,
            content: result.document.content || "",
          });
          setSelectedDoc(result.document);
        }
      } catch (error) {
        console.error("Failed to fetch document:", error);
      }
    }
  };

  const openDeleteDialog = (doc: Document) => {
    setSelectedDoc(doc);
    setDialogType("delete");
  };

  const openPreviewDialog = async (doc: Document) => {
    setSelectedDoc(doc);
    setDialogType("preview");
    
    if (currentUserId) {
      try {
        const params = new URLSearchParams({
          operatorId: currentUserId,
          docId: doc.id,
        });
        const response = await fetch(`/api/documents?${params}`);
        const result = await response.json();
        if (result.document) {
          setSelectedDoc(result.document);
        }
      } catch (error) {
        console.error("Failed to fetch document:", error);
      }
    }
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedDoc(null);
    setFormError("");
  };

  const handleCreate = async () => {
    if (!currentUserId) return;
    if (!formData.title) {
      setFormError(t("docs.titleRequired"));
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: currentUserId,
          kbId: kbId,
          title: formData.title,
          content: formData.content,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        closeDialog();
        fetchDocuments();
      } else {
        setFormError(result.error || t("error.createFailed"));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("error.createFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentUserId || !selectedDoc) return;

    if (!formData.title) {
      setFormError(t("docs.titleRequired"));
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: currentUserId,
          docId: selectedDoc.id,
          title: formData.title,
          content: formData.content,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        closeDialog();
        fetchDocuments();
      } else {
        setFormError(result.error || t("error.updateFailed"));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("error.updateFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId || !selectedDoc) return;

    setActionLoading(true);
    try {
      const params = new URLSearchParams({
        operatorId: currentUserId,
        docId: selectedDoc.id,
      });
      
      const response = await fetch(`/api/documents?${params}`, {
        method: "DELETE",
      });
      
      const result = await response.json();
      if (result.success) {
        closeDialog();
        fetchDocuments();
      } else {
        setFormError(result.error || t("error.deleteFailed"));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("error.deleteFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/knowledge-bases");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 font-mono text-sm text-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          {t("common.back")}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl font-medium">{knowledgeBase?.name || t("docs.title")}</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              {documents.length} {t("docs.document").toLowerCase()}(s)
            </p>
          </div>
          {canCreateDoc && (
            <Button onClick={openCreateDialog}>
              <PlusIcon className="mr-2 h-3 w-3" />
              {t("docs.create")}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder={t("docs.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border border-border">
        <div className="grid grid-cols-[2fr_120px_120px_160px_180px] gap-4 border-b border-border bg-card px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("docs.docTitle")}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("docs.wordCount")}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("docs.status")}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("common.createdAt")}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("common.actions")}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-xs text-muted">{t("common.loading")}...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-xs text-muted">{t("common.noData")}</span>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-[2fr_120px_120px_160px_180px] gap-4 border-b border-border px-4 py-3 last:border-b-0 hover:bg-card/50"
            >
              <div className="font-mono text-sm">{doc.title}</div>
              <div className="font-mono text-sm text-muted">
                {doc.wordCount}
              </div>
              <div>
                <span className="inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase">
                  {doc.status}
                </span>
              </div>
              <div className="font-mono text-xs text-muted">
                {new Date(doc.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openPreviewDialog(doc)}
                  className="flex h-7 w-7 items-center justify-center text-muted hover:text-foreground"
                  title={t("common.preview")}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                </button>
                {canUpdateDoc && (
                  <button
                    onClick={() => openEditDialog(doc)}
                    className="flex h-7 w-7 items-center justify-center text-muted hover:text-foreground"
                    title={t("common.edit")}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                {canDeleteDoc && (
                  <button
                    onClick={() => openDeleteDialog(doc)}
                    className="flex h-7 w-7 items-center justify-center text-muted hover:text-red-500"
                    title={t("common.delete")}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={dialogType === "create"}
        onClose={closeDialog}
        title={t("docs.create")}
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} loading={actionLoading}>
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="flex h-full flex-col gap-4">
          <Input
            label={t("docs.docTitle")}
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("docs.content")}
            </label>
            <div className="flex-1">
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
              />
            </div>
          </div>
          {formError && (
            <p className="font-mono text-xs text-red-500">{formError}</p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={dialogType === "edit"}
        onClose={closeDialog}
        title={t("docs.edit")}
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdate} loading={actionLoading}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="flex h-full flex-col gap-4">
          <Input
            label={t("docs.docTitle")}
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("docs.content")}
            </label>
            <div className="flex-1">
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
              />
            </div>
          </div>
          {formError && (
            <p className="font-mono text-xs text-red-500">{formError}</p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={dialogType === "delete"}
        onClose={closeDialog}
        title={t("docs.delete")}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={actionLoading}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="font-mono text-sm">{t("docs.confirmDelete")}</p>
          <p className="font-mono text-sm text-muted">
            {t("docs.docTitle")}: <strong>{selectedDoc?.title}</strong>
          </p>
          {formError && (
            <p className="font-mono text-xs text-red-500">{formError}</p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={dialogType === "preview"}
        onClose={closeDialog}
        title={selectedDoc?.title || t("docs.preview")}
        size="full"
        footer={
          <Button onClick={closeDialog}>
            {t("common.close")}
          </Button>
        }
      >
        <div className="flex h-full flex-col">
          <div className="mb-3 flex items-center gap-4 border-b border-border pb-2 shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("docs.wordCount")}: {selectedDoc?.wordCount}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("docs.status")}: {selectedDoc?.status}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor
              value={selectedDoc?.content || ""}
              readOnly
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function PlusIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EditIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EyeIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
