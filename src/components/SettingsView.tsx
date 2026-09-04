import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Download,
  Upload,
  RotateCcw,
  Check,
  X,
  ShieldAlert,
  Sparkles,
  Smartphone,
  FolderPlus,
  Folder,
  Layers,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Scale,
  RefreshCw,
  Lock,
  Unlock,
  Percent,
  Database,
  FileText,
  AlertCircle,
  CheckCircle2,
  Copy,
  Palette,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  CustomFieldDefinition,
  FieldType,
  RatingTemplateFolder,
  RatingTemplateItem,
  RoleWeight,
} from '../types';
import {
  exportDatabaseEntriesJson,
  importDatabaseEntriesJson,
  exportCustomizationRulesJson,
  importCustomizationRulesJson,
  exportAllDataJson,
  importDataJson,
  resetAllDataToDefault,
  getStoredRatingTemplates,
  saveRatingTemplates,
  DEFAULT_RATING_TEMPLATES,
  getStoredRoleWeights,
  saveRoleWeights,
  syncRoleWeightsWithVideos,
  recalculateAllVideoPivots,
  getStoredVideos,
  getStoredArtists,
  getStoredPivots,
  savePivots,
  getStoredArtistFields,
  saveArtistFields,
} from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';
import { ConfirmModal } from './ConfirmModal';

interface SettingsViewProps {
  fieldDefinitions: CustomFieldDefinition[];
  onUpdateFields: (fields: CustomFieldDefinition[]) => void;
  onRefreshData: () => void;
  onOpenGalleryNotes?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  fieldDefinitions,
  onUpdateFields,
  onRefreshData,
  onOpenGalleryNotes,
}) => {
  const { startThemeEditMode } = useTheme();

  // Modal for add/edit field
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for custom field
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('custom_text');
  const [optionsText, setOptionsText] = useState('');
  const [maxEntries, setMaxEntries] = useState<number>(10);
  // Option items with descriptions for multi_choice & single_choice
  const [optionItems, setOptionItems] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

  // Master Rating Templates State
  const [ratingTemplates, setRatingTemplates] = useState<RatingTemplateFolder[]>([]);
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({});

  // Collapsible main sections state (Default collapsed)
  const [isPwaOpen, setIsPwaOpen] = useState(false);
  const [isRatingTemplatesOpen, setIsRatingTemplatesOpen] = useState(false);
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);
  const [isArtistFieldsOpen, setIsArtistFieldsOpen] = useState(false);
  const [isRoleWeightsOpen, setIsRoleWeightsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Artist Fields State
  const [artistFields, setArtistFields] = useState<CustomFieldDefinition[]>([]);
  const [editingArtistField, setEditingArtistField] = useState<CustomFieldDefinition | null>(null);
  const [isArtistFieldModalOpen, setIsArtistFieldModalOpen] = useState(false);
  const [artistFieldLabel, setArtistFieldLabel] = useState('');
  const [artistFieldDesc, setArtistFieldDesc] = useState('');
  const [artistFieldType, setArtistFieldType] = useState<FieldType>('custom_text');

  // Role Weights State
  const [roleWeights, setRoleWeights] = useState<RoleWeight[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleWeight, setNewRoleWeight] = useState(100);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcStatus, setRecalcStatus] = useState<string | null>(null);

  // Folder modal state (Add / Edit Folder)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<RatingTemplateFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');

  // Item modal state (Add / Edit Item)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetFolderForNewItem, setTargetFolderForNewItem] = useState<RatingTemplateFolder | null>(null);
  const [editingItem, setEditingItem] = useState<RatingTemplateItem | null>(null);
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemDescriptionInput, setItemDescriptionInput] = useState('');

  // Import / Export Feedback
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // In-app Confirm & Alert Modals (prevents iframe alert/confirm blockage)
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Load Rating Templates and Role Weights on mount
  useEffect(() => {
    const loaded = getStoredRatingTemplates();
    setRatingTemplates(loaded);
    // Open all folders by default in settings
    const initialOpen: Record<string, boolean> = {};
    loaded.forEach((f) => {
      initialOpen[f.id] = true;
    });
    setOpenFolderIds(initialOpen);

    // Sync role weights with videos
    const storedVideos = getStoredVideos();
    const synced = syncRoleWeightsWithVideos(storedVideos);
    setRoleWeights(synced);

    // Load artist custom field definitions
    setArtistFields(getStoredArtistFields());
  }, []);

  const handleWeightChange = (roleName: string, weight: number) => {
    const clamped = Math.max(0, Math.min(100, weight));
    const updated = roleWeights.map((rw) =>
      rw.roleName.toLowerCase() === roleName.toLowerCase() && !rw.isLocked
        ? { ...rw, weight: clamped }
        : rw
    );
    setRoleWeights(updated);
    saveRoleWeights(updated);
    onRefreshData();
  };

  const handleStepRoleWeight = (roleName: string, delta: number) => {
    const targetRole = roleWeights.find((r) => r.roleName.toLowerCase() === roleName.toLowerCase());
    if (!targetRole || targetRole.isLocked) return;
    handleWeightChange(roleName, targetRole.weight + delta);
  };

  const handleToggleLockRole = (roleName: string) => {
    const updated = roleWeights.map((rw) =>
      rw.roleName.toLowerCase() === roleName.toLowerCase()
        ? { ...rw, isLocked: !rw.isLocked }
        : rw
    );
    setRoleWeights(updated);
    saveRoleWeights(updated);
    onRefreshData();
  };

  const handleAddRoleWeight = () => {
    if (!newRoleName.trim()) return;
    const trimmed = newRoleName.trim();
    if (roleWeights.some((r) => r.roleName.toLowerCase() === trimmed.toLowerCase())) {
      alert('Status peran ini sudah terdaftar!');
      return;
    }
    const updated: RoleWeight[] = [
      ...roleWeights,
      {
        id: `rw_${Date.now()}`,
        roleName: trimmed,
        weight: Math.max(0, Math.min(100, newRoleWeight)),
        isLocked: false,
      },
    ];
    setRoleWeights(updated);
    saveRoleWeights(updated);
    setNewRoleName('');
    setNewRoleWeight(100);
    onRefreshData();
  };

  const handleDeleteRoleWeight = (roleName: string) => {
    if (roleWeights.length <= 1) {
      setAlertMessage('Minimal harus ada satu status peran.');
      return;
    }
    setConfirmModalData({
      title: 'Hapus Status Peran',
      message: `Apakah Anda yakin ingin menghapus konfigurasi bobot untuk peran "${roleName}"?`,
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        const updated = roleWeights.filter(
          (rw) => rw.roleName.toLowerCase() !== roleName.toLowerCase()
        );
        setRoleWeights(updated);
        saveRoleWeights(updated);
        onRefreshData();
      },
    });
  };

  const handleRecalculateAllPivots = () => {
    setIsRecalculating(true);
    setRecalcStatus(null);
    try {
      const storedVideos = getStoredVideos();
      const currentPivots = getStoredPivots();
      const { updatedPivots, recalculatedCount, skippedLockedCount } = recalculateAllVideoPivots(
        storedVideos,
        roleWeights,
        currentPivots
      );
      savePivots(updatedPivots);
      setRecalcStatus(
        `Sukses menghitung ulang ${recalculatedCount} relasi video (${skippedLockedCount} peran terkunci dilewati)!`
      );
      onRefreshData();
    } catch (err) {
      setRecalcStatus('Terjadi kesalahan saat menghitung ulang.');
    } finally {
      setIsRecalculating(false);
      setTimeout(() => setRecalcStatus(null), 3500);
    }
  };

  const updateTemplates = (newTemplates: RatingTemplateFolder[]) => {
    setRatingTemplates(newTemplates);
    saveRatingTemplates(newTemplates);
  };

  // Toggle Folder Accordion in Settings
  const toggleFolderAccordion = (folderId: string) => {
    setOpenFolderIds((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
  };

  // FOLDER ACTIONS
  const openAddFolderModal = () => {
    setEditingFolder(null);
    setFolderNameInput('');
    setIsFolderModalOpen(true);
  };

  const openEditFolderModal = (folder: RatingTemplateFolder) => {
    setEditingFolder(folder);
    setFolderNameInput(folder.name);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;

    if (editingFolder) {
      // Edit existing folder name
      const updated = ratingTemplates.map((f) =>
        f.id === editingFolder.id ? { ...f, name: folderNameInput.trim() } : f
      );
      updateTemplates(updated);
    } else {
      // Add new folder with 1 default item
      const newFolderId = `tmpl_folder_${Date.now()}`;
      const newFolder: RatingTemplateFolder = {
        id: newFolderId,
        name: folderNameInput.trim(),
        items: [
          {
            id: `tmpl_item_${Date.now()}_1`,
            name: `${folderNameInput.trim()} - Parameter 1`,
            defaultScore: 80,
          },
        ],
      };
      updateTemplates([...ratingTemplates, newFolder]);
      setOpenFolderIds((prev) => ({ ...prev, [newFolderId]: true }));
    }

    setIsFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (ratingTemplates.length <= 1) {
      setAlertMessage('Minimal harus ada 1 kategori folder penilaian.');
      return;
    }
    setConfirmModalData({
      title: 'Hapus Kategori Rating',
      message: `Apakah Anda yakin ingin menghapus kategori "${folderName}" beserta seluruh parameter penilaian di dalamnya?`,
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        const updated = ratingTemplates.filter((f) => f.id !== folderId);
        updateTemplates(updated);
      },
    });
  };

  const handleMoveFolder = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ratingTemplates.length) return;

    const copy = [...ratingTemplates];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    updateTemplates(copy);
  };

  // ITEM ACTIONS
  const openAddItemModal = (folder: RatingTemplateFolder) => {
    setTargetFolderForNewItem(folder);
    setEditingItem(null);
    setItemNameInput('');
    setItemDescriptionInput('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (folder: RatingTemplateFolder, item: RatingTemplateItem) => {
    setTargetFolderForNewItem(folder);
    setEditingItem(item);
    setItemNameInput(item.name);
    setItemDescriptionInput(item.description || '');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNameInput.trim() || !targetFolderForNewItem) return;

    const folderId = targetFolderForNewItem.id;
    const cleanDesc = itemDescriptionInput.trim() || undefined;

    if (editingItem) {
      // Edit existing item
      const updated = ratingTemplates.map((f) => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          items: f.items.map((it) =>
            it.id === editingItem.id
              ? {
                  ...it,
                  name: itemNameInput.trim(),
                  description: cleanDesc,
                }
              : it
          ),
        };
      });
      updateTemplates(updated);
    } else {
      // Add new item to folder
      const newItem: RatingTemplateItem = {
        id: `tmpl_item_${Date.now()}`,
        name: itemNameInput.trim(),
        description: cleanDesc,
        defaultScore: 80,
      };
      const updated = ratingTemplates.map((f) => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          items: [...f.items, newItem],
        };
      });
      updateTemplates(updated);
    }

    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (folderId: string, itemId: string, itemName: string) => {
    const folder = ratingTemplates.find((f) => f.id === folderId);
    if (folder && folder.items.length <= 1) {
      setAlertMessage('Setiap kategori folder minimal harus memiliki 1 parameter penilaian.');
      return;
    }
    setConfirmModalData({
      title: 'Hapus Parameter Penilaian',
      message: `Hapus parameter penilaian "${itemName}"?`,
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        const updated = ratingTemplates.map((f) => {
          if (f.id !== folderId) return f;
          return {
            ...f,
            items: f.items.filter((it) => it.id !== itemId),
          };
        });
        updateTemplates(updated);
      },
    });
  };

  const handleResetRatingTemplates = () => {
    setConfirmModalData({
      title: 'Reset Template Rating',
      message: 'Kembalikan susunan folder & item rating ke template bawaan? Kustomisasi kategori Anda akan diatur ulang.',
      confirmText: 'Ya, Reset',
      isDanger: false,
      onConfirm: () => {
        updateTemplates(DEFAULT_RATING_TEMPLATES);
      },
    });
  };

  const openAddModal = () => {
    setEditingField(null);
    setLabel('');
    setDescription('');
    setFieldType('custom_text');
    setOptionsText('');
    setMaxEntries(10);
    setOptionItems([
      { id: 'opt_1', name: 'Pilihan 1', description: '' },
      { id: 'opt_2', name: 'Pilihan 2', description: '' },
    ]);
    setNewOptionName('');
    setNewOptionDesc('');
    setEditingOptionIndex(null);
    setIsModalOpen(true);
  };

  const openEditModal = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setLabel(field.label);
    setDescription(field.description);
    setFieldType(field.type);
    setOptionsText(field.options?.join(', ') || '');
    setMaxEntries(field.maxEntries || 10);
    const loadedOpts = (field.options || []).map((opt, idx) => ({
      id: `opt_${idx}_${Date.now()}`,
      name: opt,
      description: field.optionDescriptions?.[opt] || '',
    }));
    setOptionItems(loadedOpts);
    setNewOptionName('');
    setNewOptionDesc('');
    setEditingOptionIndex(null);
    setIsModalOpen(true);
  };

  const handleSaveField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const isChoiceType = fieldType === 'multi_choice' || fieldType === 'single_choice';
    let finalOptions: string[] = [];
    const finalOptionDescriptions: Record<string, string> = {};

    if (isChoiceType) {
      finalOptions = optionItems.map((o) => o.name.trim()).filter(Boolean);
      if (finalOptions.length === 0 && optionsText.trim()) {
        finalOptions = optionsText.split(',').map((s) => s.trim()).filter(Boolean);
      }
      optionItems.forEach((o) => {
        const trimmedName = o.name.trim();
        const trimmedDesc = o.description.trim();
        if (trimmedName && trimmedDesc) {
          finalOptionDescriptions[trimmedName] = trimmedDesc;
        }
      });
    }

    if (editingField) {
      // Update existing
      const updated = fieldDefinitions.map((f) => {
        if (f.id === editingField.id) {
          return {
            ...f,
            label: label.trim(),
            description: description.trim(),
            options: isChoiceType ? (finalOptions.length > 0 ? finalOptions : f.options) : f.options,
            optionDescriptions: isChoiceType ? finalOptionDescriptions : f.optionDescriptions,
            maxEntries,
          };
        }
        return f;
      });
      onUpdateFields(updated);
    } else {
      // Add new custom field
      const newField: CustomFieldDefinition = {
        id: `field_custom_${Date.now()}`,
        key: `custom_${Date.now()}`,
        label: label.trim(),
        description: description.trim(),
        type: fieldType,
        order: fieldDefinitions.length + 1,
        options: isChoiceType ? (finalOptions.length > 0 ? finalOptions : ['Pilihan 1', 'Pilihan 2']) : undefined,
        optionDescriptions: isChoiceType ? finalOptionDescriptions : undefined,
        maxEntries,
      };
      onUpdateFields([...fieldDefinitions, newField]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    const field = fieldDefinitions.find((f) => f.id === fieldId);
    if (field?.isSystem) {
      setAlertMessage('Field sistem inti tidak dapat dihapus, namun bisa diubah nama dan posisinya.');
      return;
    }
    setConfirmModalData({
      title: 'Hapus Field Kustom',
      message: `Yakin ingin menghapus field "${field?.label}"?`,
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        onUpdateFields(fieldDefinitions.filter((f) => f.id !== fieldId));
      },
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fieldDefinitions.length) return;

    const copy = [...fieldDefinitions];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // Reassign order
    const reordered = copy.map((item, idx) => ({ ...item, order: idx + 1 }));
    onUpdateFields(reordered);
  };

  // Safe file downloader with clipboard fallback
  const triggerDownload = (jsonStr: string, filename: string) => {
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(href);
      }, 200);
      setBackupStatus({
        type: 'success',
        message: `Berkas cadangan "${filename}" berhasil diunduh.`,
      });
    } catch (err) {
      navigator.clipboard?.writeText(jsonStr);
      setBackupStatus({
        type: 'warning',
        message: `Izin unduh ditolak oleh peramban, data JSON telah disalin ke papan klip (clipboard).`,
      });
    }
    setTimeout(() => setBackupStatus(null), 5000);
  };

  // 1. Cadangan Entri Database (Videos, Artists, Pivots)
  const handleExportDatabase = () => {
    const jsonStr = exportDatabaseEntriesJson();
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(jsonStr, `cinerate_database_entries_${dateStr}.json`);
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDatabaseEntriesJson(content);
      if (res.success) {
        setBackupStatus({ type: 'success', message: res.message });
        onRefreshData();
      } else {
        setBackupStatus({ type: 'error', message: res.message });
      }
      setTimeout(() => setBackupStatus(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 2. Cadangan Kustomisasi Aturan (Fields, Rating Templates, Role Weights)
  const handleExportRules = () => {
    const jsonStr = exportCustomizationRulesJson();
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(jsonStr, `cinerate_rules_config_${dateStr}.json`);
  };

  const handleImportRules = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importCustomizationRulesJson(content);
      if (res.success) {
        setBackupStatus({ type: 'success', message: res.message });
        setRatingTemplates(getStoredRatingTemplates());
        setRoleWeights(getStoredRoleWeights());
        onRefreshData();
      } else {
        setBackupStatus({ type: 'error', message: res.message });
      }
      setTimeout(() => setBackupStatus(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 3. Cadangan Penuh (Semua Data)
  const handleExportFull = () => {
    const jsonStr = exportAllDataJson();
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(jsonStr, `cinerate_backup_full_${dateStr}.json`);
  };

  const handleImportFull = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataJson(content);
      if (res.success) {
        setBackupStatus({ type: 'success', message: res.message });
        setRatingTemplates(getStoredRatingTemplates());
        setRoleWeights(getStoredRoleWeights());
        onRefreshData();
      } else {
        setBackupStatus({ type: 'error', message: res.message });
      }
      setTimeout(() => setBackupStatus(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    setConfirmModalData({
      title: 'Reset Semua Data',
      message:
        'Apakah Anda yakin ingin mengembalikan semua data ke sampel bawaan? Semua entri video dan profil artis buatan Anda akan digantikan dengan data sampel awal.',
      confirmText: 'Ya, Reset Semua',
      isDanger: true,
      onConfirm: () => {
        resetAllDataToDefault();
        setRatingTemplates(getStoredRatingTemplates());
        setRoleWeights(getStoredRoleWeights());
        onRefreshData();
        setBackupStatus({
          type: 'success',
          message: 'Semua data dan kustomisasi telah dikembalikan ke sampel awal.',
        });
        setTimeout(() => setBackupStatus(null), 4000);
      },
    });
  };

  return (
    <div id="settings-view" className="space-y-2.5 pb-24 animate-in fade-in font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#E5A93C]" />
          <span className="text-sm font-bold text-[#F0F6FC] tracking-tight">Pengaturan</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenGalleryNotes && (
            <button
              type="button"
              onClick={onOpenGalleryNotes}
              className="px-2 py-1 rounded bg-[#212631] hover:bg-[#30363D] text-[#F0F6FC] border border-[#30363D] text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
              title="Kelola & Lihat Daftar Catatan Galeri"
            >
              <FileText className="w-3 h-3 text-indigo-400" />
              <span>Catatan Galeri</span>
            </button>
          )}
          <button
            type="button"
            onClick={startThemeEditMode}
            className="px-2 py-1 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Palette className="w-3 h-3" />
            <span>Edit Tema</span>
          </button>
        </div>
      </div>

      {/* PWA Section (Collapsible, default: collapsed) */}
      <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsPwaOpen(!isPwaOpen)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-[#212631] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Aplikasi PWA Mobile</h3>
              <p className="text-[10px] text-[#8B949E]">Dukungan offline dan layar HP</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#8B949E] text-[10px] shrink-0 ml-2">
            <span>{isPwaOpen ? 'Tutup' : 'Buka'}</span>
            {isPwaOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isPwaOpen && (
          <div className="p-2.5 pt-1 border-t border-[#30363D] animate-in fade-in">
            <PWAInstallButton />
          </div>
        )}
      </div>

      {/* Master Rating Folders & Items Management (Collapsible, default: collapsed) */}
      <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsRatingTemplatesOpen(!isRatingTemplatesOpen)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-[#212631] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Kategori &amp; Item Penilaian</h3>
              <p className="text-[10px] text-[#8B949E]">
                {ratingTemplates.length} Kategori folder &amp; parameter penilaian
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#8B949E] text-[10px] shrink-0 ml-2">
            <span>{isRatingTemplatesOpen ? 'Tutup' : 'Buka'}</span>
            {isRatingTemplatesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isRatingTemplatesOpen && (
          <div className="p-2.5 pt-1.5 border-t border-[#30363D] space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#8B949E]">
                Kelola nama kategori &amp; parameter penilaian form video
              </p>
              <button
                type="button"
                onClick={handleResetRatingTemplates}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[#111319] hover:bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] transition shrink-0 cursor-pointer"
                title="Kembalikan kategori & item ke default"
              >
                Reset Bawaan
              </button>
            </div>

            {/* Rating Folders List */}
            <div className="space-y-1.5">
              {ratingTemplates.map((folder, fIdx) => {
                const isFolderOpen = openFolderIds[folder.id] !== false;
                return (
                  <div
                    key={folder.id}
                    className="rounded border border-[#30363D] bg-[#111319] overflow-hidden"
                  >
                    {/* Folder Header */}
                    <div className="flex items-center justify-between p-2 bg-[#181B22] border-b border-[#30363D]">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="flex flex-col items-center text-[#8B949E] shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveFolder(fIdx, 'up')}
                            disabled={fIdx === 0}
                            className="p-0.5 rounded hover:bg-[#212631] disabled:opacity-20 cursor-pointer"
                            title="Pindah ke Atas"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFolder(fIdx, 'down')}
                            disabled={fIdx === ratingTemplates.length - 1}
                            className="p-0.5 rounded hover:bg-[#212631] disabled:opacity-20 cursor-pointer"
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleFolderAccordion(folder.id)}
                          className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded bg-[#111319] text-[#E5A93C] border border-[#30363D] flex items-center justify-center text-[9px] font-bold shrink-0">
                            {fIdx + 1}
                          </span>
                          <span className="font-bold text-xs text-[#F0F6FC] truncate">
                            {folder.name}
                          </span>
                          <span className="text-[9px] text-[#8B949E] bg-[#111319] px-1 py-0.2 rounded border border-[#30363D] shrink-0">
                            {folder.items.length}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        <button
                          type="button"
                          onClick={() => openEditFolderModal(folder)}
                          className="p-1 rounded bg-[#212631] hover:bg-[#30363D] text-[#8B949E] hover:text-[#E5A93C] transition cursor-pointer"
                          title="Ubah Nama Kategori"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder.id, folder.name)}
                          className="p-1 rounded bg-[#212631] hover:bg-rose-950/60 text-[#8B949E] hover:text-rose-400 transition cursor-pointer"
                          title="Hapus Kategori Ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFolderAccordion(folder.id)}
                          className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
                        >
                          {isFolderOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Folder Items List */}
                    {isFolderOpen && (
                      <div className="p-2 bg-[#0D1117] space-y-1.5 animate-in fade-in">
                        <div className="space-y-1">
                          {folder.items.map((item, iIdx) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-1.5 rounded bg-[#181B22] border border-[#30363D] text-xs"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-3.5 h-3.5 rounded bg-[#111319] text-[9px] text-[#8B949E] flex items-center justify-center shrink-0">
                                    {iIdx + 1}
                                  </span>
                                  <span className="font-medium text-[#F0F6FC] text-[11px] truncate">
                                    {item.name}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="text-[10px] text-[#8B949E] mt-0.5 pl-5">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditItemModal(folder, item)}
                                  className="p-1 rounded text-[#8B949E] hover:text-[#E5A93C] transition cursor-pointer"
                                  title="Ubah Nama Parameter"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteItem(folder.id, item.id, item.name)
                                  }
                                  className="p-1 rounded text-[#8B949E] hover:text-rose-400 transition cursor-pointer"
                                  title="Hapus Parameter"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Item Button for this folder */}
                        <button
                          type="button"
                          onClick={() => openAddItemModal(folder)}
                          className="w-full py-1 rounded border border-dashed border-[#30363D] hover:border-[#E5A93C] text-[#8B949E] hover:text-[#E5A93C] hover:bg-[#181B22] text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-[#E5A93C]" />
                          <span>+ Parameter di "{folder.name}"</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Folder Button */}
            <button
              type="button"
              onClick={openAddFolderModal}
              className="w-full py-1.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Kategori Folder Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Custom Fields Management List (Collapsible, default: collapsed) */}
      <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsFieldsOpen(!isFieldsOpen)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-[#212631] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
              <ListPlus className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Struktur &amp; Urutan Field Video</h3>
              <p className="text-[10px] text-[#8B949E]">
                {fieldDefinitions.length} Field aktif &amp; urutan form entri
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#8B949E] text-[10px] shrink-0 ml-2">
            <span>{isFieldsOpen ? 'Tutup' : 'Buka'}</span>
            {isFieldsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isFieldsOpen && (
          <div className="p-2.5 pt-1.5 border-t border-[#30363D] space-y-2 animate-in fade-in">
            {/* List View with drag/reorder handle, Edit, Delete */}
            <div className="space-y-1.5">
              {fieldDefinitions.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-2 rounded bg-[#111319] border border-[#30363D] hover:border-[#8B949E]/40 transition text-xs"
                >
                  {/* Drag/Reorder buttons */}
                  <div className="flex flex-col items-center text-[#8B949E] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-[#212631] disabled:opacity-20 transition cursor-pointer"
                      title="Pindah ke Atas"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <div className="flex items-center justify-center text-[#484F58]">
                      <GripVertical className="w-3 h-3" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === fieldDefinitions.length - 1}
                      className="p-0.5 rounded hover:bg-[#212631] disabled:opacity-20 transition cursor-pointer"
                      title="Pindah ke Bawah"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Field Label & Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#F0F6FC] truncate">
                        {field.label}
                      </h4>
                      {field.isSystem && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#181B22] text-[#8B949E] border border-[#30363D]">
                          SISTEM
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8B949E] mt-0.5 line-clamp-1">
                      {field.description}
                    </p>
                    {field.options && field.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {field.options.slice(0, 4).map((opt, oIdx) => (
                          <span
                            key={oIdx}
                            className="px-1 py-0.2 rounded bg-[#181B22] text-[9px] text-[#E5A93C] border border-[#30363D]"
                          >
                            {opt}
                          </span>
                        ))}
                        {field.options.length > 4 && (
                          <span className="text-[9px] text-[#8B949E]">
                            +{field.options.length - 4} opsi
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(field)}
                      className="p-1 rounded bg-[#212631] hover:bg-[#30363D] text-[#8B949E] hover:text-[#E5A93C] transition cursor-pointer"
                      title="Edit Field"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {!field.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1 rounded bg-[#212631] hover:bg-rose-950/60 text-[#8B949E] hover:text-rose-400 transition cursor-pointer"
                        title="Hapus Field"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Button to Add New Field */}
            <button
              type="button"
              onClick={openAddModal}
              className="w-full py-1.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Field Video Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Section Pengaturan: "Struktur & Urutan Field Artis" */}
      <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsArtistFieldsOpen(!isArtistFieldsOpen)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-[#212631] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
              <ListPlus className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Struktur &amp; Urutan Field Artis</h3>
              <p className="text-[10px] text-[#8B949E]">
                {artistFields.length} Field kustomisasi form Buat/Edit Entri Artis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#8B949E] text-[10px] shrink-0 ml-2">
            <span>{isArtistFieldsOpen ? 'Tutup' : 'Buka'}</span>
            {isArtistFieldsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isArtistFieldsOpen && (
          <div className="p-2.5 pt-1.5 border-t border-[#30363D] space-y-2 animate-in fade-in">
            <p className="text-[10px] text-[#8B949E]">
              Kustomisasi struktur form entri artis. Data field yang dihapus tidak hilang permanen.
            </p>

            {/* List View Field Artis */}
            <div className="space-y-1.5">
              {artistFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 p-2 rounded bg-[#111319] border border-[#30363D] hover:border-[#8B949E]/40 transition text-xs"
                >
                  {/* Drag/Reorder buttons */}
                  <div className="flex flex-col items-center text-[#8B949E] shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const copy = [...artistFields];
                        const temp = copy[idx];
                        copy[idx] = copy[idx - 1];
                        copy[idx - 1] = temp;
                        const reordered = copy.map((it, i) => ({ ...it, order: i + 1 }));
                        setArtistFields(reordered);
                        saveArtistFields(reordered);
                      }}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-[#212631] disabled:opacity-20 transition cursor-pointer"
                      title="Pindah ke Atas"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <GripVertical className="w-3 h-3 text-[#484F58]" />
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === artistFields.length - 1) return;
                        const copy = [...artistFields];
                        const temp = copy[idx];
                        copy[idx] = copy[idx + 1];
                        copy[idx + 1] = temp;
                        const reordered = copy.map((it, i) => ({ ...it, order: i + 1 }));
                        setArtistFields(reordered);
                        saveArtistFields(reordered);
                      }}
                      disabled={idx === artistFields.length - 1}
                      className="p-0.5 rounded hover:bg-[#212631] disabled:opacity-20 transition cursor-pointer"
                      title="Pindah ke Bawah"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Field Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-[#F0F6FC] truncate">{field.label}</h4>
                      {field.isSystem && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#181B22] text-[#E5A93C] border border-[#30363D]">
                          WAJIB / SISTEM
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8B949E] mt-0.5">{field.description}</p>
                  </div>

                  {/* Delete button (Non-system fields only) */}
                  {!field.isSystem && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmModalData({
                          title: 'Sembunyikan / Hapus Field Artis',
                          message: `Sembunyikan field "${field.label}" dari form artis? Data historis yang tersimpan tidak akan hilang secara permanen.`,
                          confirmText: 'Sembunyikan',
                          isDanger: true,
                          onConfirm: () => {
                            const updated = artistFields.filter((f) => f.id !== field.id);
                            setArtistFields(updated);
                            saveArtistFields(updated);
                          },
                        });
                      }}
                      className="p-1 rounded bg-[#212631] hover:bg-rose-950/60 text-[#8B949E] hover:text-rose-400 transition cursor-pointer"
                      title="Hapus / Sembunyikan Field"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Button Tambah Field Artis Baru */}
            <button
              type="button"
              onClick={() => {
                setEditingArtistField(null);
                setArtistFieldLabel('');
                setArtistFieldDesc('');
                setArtistFieldType('custom_text');
                setIsArtistFieldModalOpen(true);
              }}
              className="w-full py-1.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Field Form Artis Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Weights Configuration (Collapsible, default: collapsed) */}
      <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsRoleWeightsOpen(!isRoleWeightsOpen)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-[#212631] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Konfigurasi Bobot Status Peran</h3>
              <p className="text-[10px] text-[#8B949E]">
                {roleWeights.length} Status peran terdaftar (0-100%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#8B949E] text-[10px] shrink-0 ml-2">
            <span>{isRoleWeightsOpen ? 'Tutup' : 'Buka'}</span>
            {isRoleWeightsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isRoleWeightsOpen && (
          <div className="p-2.5 pt-1.5 border-t border-[#30363D] space-y-2.5 animate-in fade-in">
            <div className="p-2 rounded bg-[#111319] border border-[#30363D] text-[10px] text-[#8B949E] space-y-1">
              <div className="font-bold text-[#E5A93C] flex items-center gap-1">
                <Scale className="w-3 h-3 text-[#E5A93C]" />
                <span>Rumus Rating Artis:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li><strong className="text-[#F0F6FC]">Nilai Didapat Artis:</strong> <code className="text-[#E5A93C] bg-[#181B22] px-1 py-0.2 rounded">(Nilai Video × Bobot) / 100</code></li>
                <li><strong className="text-[#F0F6FC]">Rating Artis:</strong> Rata-rata dari seluruh nilai peran yang didapatkan artis.</li>
              </ul>
            </div>

            {/* Hitung Ulang Semua Nilai Video Action */}
            <div className="p-2 rounded bg-[#111319] border border-[#30363D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-[#F0F6FC] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-[#E5A93C]" />
                  <span>Sinkronisasi Nilai Relasi</span>
                </div>
                <p className="text-[10px] text-[#8B949E] mt-0.5">
                  Kalkulasi ulang nilai semua relasi video berdasarkan bobot terbaru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecalculateAllPivots}
                disabled={isRecalculating}
                className="py-1 px-2.5 rounded bg-[#212631] hover:bg-[#30363D] disabled:opacity-50 text-[#E5A93C] border border-[#30363D] text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRecalculating ? 'animate-spin' : ''}`} />
                <span>{isRecalculating ? 'Menghitung...' : 'Hitung Ulang Semua'}</span>
              </button>
            </div>

            {recalcStatus && (
              <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800 text-[10px] font-semibold text-emerald-300 animate-in fade-in">
                {recalcStatus}
              </div>
            )}

            {/* Role Weights List with Lock & Step Navigation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#8B949E] px-1">
                <span>Daftar Status Peran &amp; Bobot</span>
                <span>Bobot (%)</span>
              </div>

              {roleWeights.map((rw) => (
                <div
                  key={rw.id}
                  className="p-2 rounded bg-[#111319] border border-[#30363D] space-y-1.5 hover:border-[#8B949E]/40 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-[#F0F6FC] truncate">
                        {rw.roleName}
                      </span>
                      {rw.isLocked && (
                        <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-[#181B22] text-[#E5A93C] border border-[#30363D] flex items-center gap-0.5">
                          <Lock className="w-2 h-2" />
                          Lock
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleLockRole(rw.roleName)}
                        className={`p-1 rounded border transition text-xs flex items-center gap-1 cursor-pointer ${
                          rw.isLocked
                            ? 'bg-[#181B22] border-[#E5A93C]/40 text-[#E5A93C]'
                            : 'bg-[#181B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
                        }`}
                        title={rw.isLocked ? 'Buka kunci slider edit' : 'Kunci slider agar tidak dapat diubah manual'}
                      >
                        {rw.isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoleWeight(rw.roleName)}
                        className="p-1 rounded bg-[#181B22] hover:bg-rose-950/60 border border-[#30363D] hover:border-rose-800 text-[#8B949E] hover:text-rose-400 transition cursor-pointer"
                        title="Hapus status peran"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Weight Slider with Step +5 / -5 buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* -5 Step Button */}
                    <button
                      type="button"
                      disabled={rw.isLocked || rw.weight <= 0}
                      onClick={() => handleStepRoleWeight(rw.roleName, -5)}
                      className="px-1.5 py-0.5 rounded bg-[#181B22] hover:bg-[#212631] border border-[#30363D] disabled:opacity-30 text-[#F0F6FC] text-[10px] font-bold cursor-pointer transition shrink-0"
                      title="Turunkan 5%"
                    >
                      -5
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={rw.isLocked}
                      value={rw.weight}
                      onChange={(e) => handleWeightChange(rw.roleName, Number(e.target.value))}
                      className="flex-1 accent-[#E5A93C] h-1.5 bg-[#181B22] rounded cursor-pointer disabled:opacity-40"
                    />

                    {/* +5 Step Button */}
                    <button
                      type="button"
                      disabled={rw.isLocked || rw.weight >= 100}
                      onClick={() => handleStepRoleWeight(rw.roleName, 5)}
                      className="px-1.5 py-0.5 rounded bg-[#181B22] hover:bg-[#212631] border border-[#30363D] disabled:opacity-30 text-[#F0F6FC] text-[10px] font-bold cursor-pointer transition shrink-0"
                      title="Naikkan 5%"
                    >
                      +5
                    </button>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={rw.isLocked}
                        value={rw.weight}
                        onChange={(e) => handleWeightChange(rw.roleName, Number(e.target.value))}
                        className="w-11 py-0.5 px-1 text-center text-xs font-bold rounded bg-[#181B22] border border-[#30363D] text-[#F0F6FC] focus:outline-none focus:border-[#E5A93C] disabled:opacity-40 font-mono"
                      />
                      <span className="text-[10px] font-bold text-[#8B949E]">%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Tambah Status Peran Baru */}
            <div className="p-2 rounded bg-[#111319] border border-[#30363D] space-y-1.5">
              <div className="text-xs font-bold text-[#F0F6FC] flex items-center gap-1">
                <Plus className="w-3 h-3 text-[#E5A93C]" />
                <span>Tambah Status Peran Baru</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5">
                <input
                  type="text"
                  placeholder="Nama peran (misal: Cameo, Figuran)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded bg-[#181B22] border border-[#30363D] text-[#F0F6FC] placeholder:text-[#8B949E] focus:outline-none focus:border-[#E5A93C]"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRoleWeight}
                    onChange={(e) => setNewRoleWeight(Number(e.target.value))}
                    className="w-16 px-1 py-1 text-center text-xs font-bold rounded bg-[#181B22] border border-[#30363D] text-[#F0F6FC] focus:outline-none focus:border-[#E5A93C] font-mono"
                  />
                  <span className="text-[10px] font-bold text-[#8B949E]">%</span>
                  <button
                    type="button"
                    onClick={handleAddRoleWeight}
                    className="py-1 px-2.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backup & Data Persistence Management (Collapsible, default: collapsed) */}
      <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBackupOpen(!isBackupOpen)}
          className="w-full flex items-center justify-between p-2.5 hover:bg-[#212631] transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Manajemen Data &amp; Cadangan</h3>
              <p className="text-[10px] text-[#8B949E]">Ekspor berkas cadangan, impor JSON, atau reset data</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#8B949E] text-[10px] shrink-0 ml-2">
            <span>{isBackupOpen ? 'Tutup' : 'Buka'}</span>
            {isBackupOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isBackupOpen && (
          <div className="p-2.5 pt-1.5 border-t border-[#30363D] space-y-2.5 animate-in fade-in">
            {/* Status Notification */}
            {backupStatus && (
              <div
                className={`p-2 rounded border text-[11px] font-medium flex items-start gap-1.5 animate-in fade-in ${
                  backupStatus.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : backupStatus.type === 'error'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : backupStatus.type === 'warning'
                    ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                    : 'bg-[#181B22] border-[#30363D] text-[#8B949E]'
                }`}
              >
                {backupStatus.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span className="flex-1 leading-relaxed">{backupStatus.message}</span>
              </div>
            )}

            {/* 1. Cadangan Entri Database (Videos, Artis, Relasi Peran) */}
            <div className="p-2.5 rounded bg-[#111319] border border-[#30363D] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <h4 className="text-xs font-bold text-[#F0F6FC]">
                    Cadangan Entri Database
                  </h4>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 bg-[#181B22] border border-emerald-800/60 px-1.5 py-0.2 rounded">
                  Data Konten
                </span>
              </div>
              <p className="text-[10px] text-[#8B949E]">
                Mencakup semua data entri video, profil artis, dan data relasi pivot penilaian.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] text-[#8B949E] bg-[#181B22] px-2 py-1 rounded border border-[#30363D]">
                <span>{getStoredVideos().length} Video</span>
                <span>•</span>
                <span>{getStoredArtists().length} Profil Artis</span>
                <span>•</span>
                <span>{getStoredPivots().length} Relasi Peran</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  className="py-1 px-2.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-bold flex items-center justify-center gap-1 border border-[#30363D] transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Ekspor Entri DB</span>
                </button>
                <label className="py-1 px-2.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-bold flex items-center justify-center gap-1 border border-[#30363D] transition active:scale-95 cursor-pointer">
                  <Upload className="w-3 h-3 text-emerald-400" />
                  <span>Impor Entri DB</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportDatabase}
                  />
                </label>
              </div>
            </div>

            {/* 2. Cadangan Kustomisasi Aturan (Field Kustom, Folder & Item Rating, Bobot Peran) */}
            <div className="p-2.5 rounded bg-[#111319] border border-[#30363D] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <h4 className="text-xs font-bold text-[#F0F6FC]">
                    Cadangan Kustomisasi Aturan
                  </h4>
                </div>
                <span className="text-[9px] font-bold text-[#E5A93C] bg-[#181B22] border border-[#E5A93C]/40 px-1.5 py-0.2 rounded">
                  Aturan &amp; Rumus
                </span>
              </div>
              <p className="text-[10px] text-[#8B949E]">
                Mencakup tata letak field kustom, folder &amp; parameter penilaian, serta bobot peran.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] text-[#8B949E] bg-[#181B22] px-2 py-1 rounded border border-[#30363D]">
                <span>{fieldDefinitions.length} Field Video</span>
                <span>•</span>
                <span>{artistFields.length} Field Artis</span>
                <span>•</span>
                <span>{ratingTemplates.length} Folder Rating</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleExportRules}
                  className="py-1 px-2.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-bold flex items-center justify-center gap-1 border border-[#30363D] transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-[#E5A93C]" />
                  <span>Ekspor Aturan</span>
                </button>
                <label className="py-1 px-2.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#F0F6FC] text-xs font-bold flex items-center justify-center gap-1 border border-[#30363D] transition active:scale-95 cursor-pointer">
                  <Upload className="w-3 h-3 text-[#E5A93C]" />
                  <span>Impor Aturan</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportRules}
                  />
                </label>
              </div>
            </div>

            {/* 3. Cadangan Penuh (Semua Data) & Reset Bawaan */}
            <div className="p-2.5 rounded bg-[#111319] border border-[#30363D] space-y-2">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-[#8B949E]" />
                <h4 className="text-xs font-bold text-[#8B949E]">
                  Cadangan Lengkap &amp; Reset
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleExportFull}
                  className="py-1 px-2 rounded bg-[#181B22] hover:bg-[#212631] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-[#8B949E]" />
                  <span>Ekspor Lengkap</span>
                </button>
                <label className="py-1 px-2 rounded bg-[#181B22] hover:bg-[#212631] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer">
                  <Upload className="w-3 h-3 text-[#8B949E]" />
                  <span>Impor Lengkap</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFull}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleResetData}
                className="w-full py-1.5 rounded bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Semua Data ke Sampel Bawaan</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Field Editor Dialog Pop-up */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md mx-auto bg-[#181B22] border border-[#30363D] rounded-t-md sm:rounded-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-3 border-b border-[#30363D] bg-[#111319]">
              <h3 className="text-xs font-bold text-[#F0F6FC]">
                {editingField ? 'Edit Konfigurasi Field' : 'Tambah Field Kustom Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="p-3 space-y-3">
              {/* Field Label & Required Toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#8B949E]">Nama Field</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingField?.is_required}
                      onChange={(e) => {
                        if (editingField) {
                          setEditingField({ ...editingField, is_required: e.target.checked });
                        }
                      }}
                      className="w-3.5 h-3.5 accent-[#E5A93C] rounded cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-[#E5A93C]">Wajib Diisi (Required)</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: Sutradara / Agensi / Lokasi"
                  className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">Deskripsi Penjelasan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan fungsi field ini..."
                  className="w-full p-2 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              {/* Field Type (if new) */}
              {!editingField && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8B949E]">Tipe Input</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as FieldType)}
                    className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                  >
                    <option value="custom_text">Text Field Biasa</option>
                    <option value="multi_choice">MultiChoice (Bisa banyak tag)</option>
                    <option value="single_choice">SingleChoice (Pilihan tunggal)</option>
                  </select>
                </div>
              )}

              {/* Options for multi_choice or single_choice */}
              {(fieldType === 'multi_choice' ||
                fieldType === 'single_choice' ||
                editingField?.type === 'multi_choice' ||
                editingField?.type === 'single_choice') && (
                <div className="space-y-2 p-2.5 rounded bg-[#111319] border border-[#30363D]">
                  <div>
                    <label className="text-xs font-bold text-[#F0F6FC] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#E5A93C]" />
                      <span>Kelola Opsi ({optionItems.length} Opsi)</span>
                    </label>
                    <p className="text-[10px] text-[#8B949E] mt-0.5">
                      Setiap opsi bisa diberi deskripsi opsional.
                    </p>
                  </div>

                  {/* List of current option items */}
                  {optionItems.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {optionItems.map((optItem, oIdx) => (
                        <div
                          key={optItem.id}
                          className="flex items-start justify-between p-2 rounded bg-[#181B22] border border-[#30363D] text-xs gap-1.5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-full bg-[#212631] text-[9px] font-bold text-[#8B949E] flex items-center justify-center shrink-0">
                                {oIdx + 1}
                              </span>
                              <span className="font-bold text-[#F0F6FC] truncate">{optItem.name}</span>
                            </div>
                            {optItem.description ? (
                              <p className="text-[10px] text-[#E5A93C] mt-0.5 pl-5 leading-relaxed">
                                {optItem.description}
                              </p>
                            ) : (
                              <p className="text-[9px] text-[#8B949E] italic mt-0.5 pl-5">
                                (Tanpa deskripsi)
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOptionIndex(oIdx);
                                setNewOptionName(optItem.name);
                                setNewOptionDesc(optItem.description);
                              }}
                              className="p-1 rounded text-[#8B949E] hover:text-[#E5A93C] transition"
                              title="Edit Opsi"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (optionItems.length <= 1) {
                                  alert('Minimal harus ada 1 opsi pilihan.');
                                  return;
                                }
                                setOptionItems(optionItems.filter((_, i) => i !== oIdx));
                                if (editingOptionIndex === oIdx) {
                                  setEditingOptionIndex(null);
                                  setNewOptionName('');
                                  setNewOptionDesc('');
                                }
                              }}
                              className="p-1 rounded text-[#8B949E] hover:text-rose-400 transition"
                              title="Hapus Opsi"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add / Edit Option Card */}
                  <div className="p-2 rounded bg-[#181B22] border border-[#30363D] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#E5A93C] block">
                      {editingOptionIndex !== null ? 'Ubah Opsi Terpilih' : '+ Tambah Opsi Baru'}
                    </span>
                    <input
                      type="text"
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      placeholder="Nama opsi (contoh: Action, Streaming, dll)"
                      className="w-full py-1 px-2 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                    />
                    <textarea
                      rows={2}
                      value={newOptionDesc}
                      onChange={(e) => setNewOptionDesc(e.target.value)}
                      placeholder="Deskripsi opsi (opsional)"
                      className="w-full p-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                    />
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newOptionName.trim()) return;
                          if (editingOptionIndex !== null) {
                            const updated = [...optionItems];
                            updated[editingOptionIndex] = {
                              ...updated[editingOptionIndex],
                              name: newOptionName.trim(),
                              description: newOptionDesc.trim(),
                            };
                            setOptionItems(updated);
                            setEditingOptionIndex(null);
                          } else {
                            setOptionItems([
                              ...optionItems,
                              {
                                id: `opt_${Date.now()}`,
                                name: newOptionName.trim(),
                                description: newOptionDesc.trim(),
                              },
                            ]);
                          }
                          setNewOptionName('');
                          setNewOptionDesc('');
                        }}
                        className="flex-1 py-1 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>{editingOptionIndex !== null ? 'Perbarui Opsi' : 'Tambahkan Opsi'}</span>
                      </button>
                      {editingOptionIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOptionIndex(null);
                            setNewOptionName('');
                            setNewOptionDesc('');
                          }}
                          className="px-2.5 py-1 rounded bg-[#181B22] hover:bg-[#212631] border border-[#30363D] text-[#8B949E] text-xs font-bold"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Max Entries */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">Jumlah Maksimal Entri</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(Number(e.target.value))}
                  className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] font-mono"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-2 rounded bg-[#E5A93C] hover:bg-[#d4982f] text-black font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 mt-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Konfigurasi Field</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Folder Kategori */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md mx-auto bg-[#181B22] border border-[#30363D] rounded-t-md sm:rounded-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-3 border-b border-[#30363D] bg-[#111319]">
              <h3 className="text-xs font-bold text-[#F0F6FC] flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>{editingFolder ? 'Ubah Nama Kategori' : 'Tambah Kategori Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">
                  Nama Kategori Folder
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="Contoh: Tata Artistik & Kostum"
                  className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
                <p className="text-[10px] text-[#8B949E]">
                  Kategori ini akan mengelompokkan beberapa parameter penilaian video.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded bg-[#E5A93C] hover:bg-[#d4982f] text-black font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 mt-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingFolder ? 'Simpan Perubahan' : 'Buat Kategori'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Field Artis Baru */}
      {isArtistFieldModalOpen && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md mx-auto bg-[#181B22] border border-[#30363D] rounded-t-md sm:rounded-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-3 border-b border-[#30363D] bg-[#111319]">
              <h3 className="text-xs font-bold text-[#F0F6FC]">Tambah Field Form Artis Baru</h3>
              <button
                type="button"
                onClick={() => setIsArtistFieldModalOpen(false)}
                className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!artistFieldLabel.trim()) return;

                const newF: CustomFieldDefinition = {
                  id: `art_field_${Date.now()}`,
                  key: artistFieldLabel.trim().toLowerCase().replace(/\s+/g, '_'),
                  label: artistFieldLabel.trim(),
                  description: artistFieldDesc.trim() || 'Field kustom entri artis',
                  type: artistFieldType,
                  order: artistFields.length + 1,
                  isSystem: false,
                };

                const updated = [...artistFields, newF];
                setArtistFields(updated);
                saveArtistFields(updated);
                setIsArtistFieldModalOpen(false);
              }}
              className="p-3 space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">Nama Field Artis</label>
                <input
                  type="text"
                  required
                  value={artistFieldLabel}
                  onChange={(e) => setArtistFieldLabel(e.target.value)}
                  placeholder="Contoh: Media Sosial / Lokasi Lahir / Agensi"
                  className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">Deskripsi Field</label>
                <textarea
                  rows={2}
                  value={artistFieldDesc}
                  onChange={(e) => setArtistFieldDesc(e.target.value)}
                  placeholder="Penjelasan fungsi field ini pada profil artis..."
                  className="w-full p-2 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">Tipe Field</label>
                <select
                  value={artistFieldType}
                  onChange={(e) => setArtistFieldType(e.target.value as FieldType)}
                  className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                >
                  <option value="custom_text">Text (Teks Kustom Biasa)</option>
                  <option value="text_dynamic_filter">Field Text (Support Dynamic Filtering)</option>
                  <option value="number">Number (Angka - Support Dynamic Filtering)</option>
                  <option value="button_link">Button/Link (Tombol Tautan)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded bg-[#E5A93C] hover:bg-[#d4982f] text-black font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Field Artis</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Parameter Item */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md mx-auto bg-[#181B22] border border-[#30363D] rounded-t-md sm:rounded-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-3 border-b border-[#30363D] bg-[#111319]">
              <div>
                <h3 className="text-xs font-bold text-[#F0F6FC] flex items-center gap-1.5">
                  <ListPlus className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>{editingItem ? 'Ubah Parameter' : 'Tambah Parameter Penilaian'}</span>
                </h3>
                {targetFolderForNewItem && (
                  <p className="text-[10px] text-[#E5A93C] mt-0.5">
                    Kategori: {targetFolderForNewItem.name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">
                  Nama Parameter Penilaian
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={itemNameInput}
                  onChange={(e) => setItemNameInput(e.target.value)}
                  placeholder="Contoh: Tata Rias & Karakterisasi"
                  className="w-full py-1.5 px-2.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
                <p className="text-[10px] text-[#8B949E]">
                  Parameter ini akan dinilai dengan skala nilai 0 - 100 di form video.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8B949E]">
                  Deskripsi Parameter (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={itemDescriptionInput}
                  onChange={(e) => setItemDescriptionInput(e.target.value)}
                  placeholder="Contoh: Fokus pada sudut kamera dinamis, keharmonisan pencahayaan dan tone warna"
                  className="w-full p-2 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                />
                <p className="text-[10px] text-[#8B949E] leading-relaxed">
                  Deskripsi akan muncul di bawah nama item di halaman video.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded bg-[#E5A93C] hover:bg-[#d4982f] text-black font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan Parameter'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for Deletions and Resets */}
      <ConfirmModal
        isOpen={!!confirmModalData}
        title={confirmModalData?.title || 'Konfirmasi'}
        message={confirmModalData?.message || ''}
        confirmText={confirmModalData?.confirmText || 'Ya, Lanjutkan'}
        cancelText={confirmModalData?.cancelText || 'Batal'}
        isDanger={confirmModalData?.isDanger !== false}
        onConfirm={() => {
          confirmModalData?.onConfirm();
          setConfirmModalData(null);
        }}
        onClose={() => setConfirmModalData(null)}
      />

      {/* In-app Simple Alert Dialog */}
      {alertMessage && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-[#181B22] border border-[#30363D] rounded-md p-3 shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#111319] border border-[#30363D] text-[#E5A93C] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#F0F6FC]">Pemberitahuan</h3>
            </div>
            <p className="text-xs text-[#8B949E] leading-relaxed">{alertMessage}</p>
            <button
              type="button"
              onClick={() => setAlertMessage(null)}
              className="w-full py-1.5 rounded bg-[#212631] hover:bg-[#30363D] text-[#E5A93C] border border-[#30363D] text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
