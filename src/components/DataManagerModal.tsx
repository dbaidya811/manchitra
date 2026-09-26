import React, { useState, useRef } from 'react';
import {
  X,
  FileJson,
  Upload,
  Download,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  FolderOpen,
  Map,
  AlertCircle
} from 'lucide-react';
import { Place } from '../types';
import placesDefault from '../data/places.json';
import { getSafeImageUrl, handleImageError } from '../utils/imageHelper';

interface DataManagerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  places: Place[];
  onUpdatePlaces?: (newPlaces: Place[]) => void;
  onImportJsonText?: (jsonText: string) => void;
  onImportJsonFile?: (file: File) => void;
  onUploadImages?: (files: FileList) => void;
  onResetToDefaults?: () => void;
  uploadedImages?: { name: string; url: string }[];
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  isOpen = true,
  onClose,
  places,
  onUpdatePlaces,
  onImportJsonText,
  onImportJsonFile,
  onUploadImages,
  onResetToDefaults,
  uploadedImages = []
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'json' | 'images' | 'osm'>('json');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4000);
  };

  // Handle uploading and parsing custom places.json
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onImportJsonFile) {
      onImportJsonFile(file);
      showNotification(`Imported ${file.name} successfully!`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (onImportJsonText) {
          onImportJsonText(text);
          showNotification('JSON imported successfully!');
        } else if (onUpdatePlaces) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            onUpdatePlaces(parsed as Place[]);
            showNotification(`Successfully loaded ${parsed.length} places!`);
          }
        }
      } catch (err: unknown) {
        showNotification(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Invalid format'}`, true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export current places.json
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(places, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'places.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Exported current places.json successfully!');
  };

  // Reset to default places.json
  const handleResetToDefault = () => {
    if (onResetToDefaults) {
      onResetToDefaults();
    } else if (onUpdatePlaces) {
      onUpdatePlaces(placesDefault as Place[]);
    }
    showNotification('Reset to user database from folder!');
  };

  // Handle uploading photos/images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (onUploadImages) {
      onUploadImages(files);
      showNotification(`Uploaded ${files.length} photos successfully!`);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                JSON &amp; Image Assets Manager
              </h2>
              <p className="text-[11px] text-slate-500">
                Manage dataset and image assets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl flex items-center gap-2 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl flex items-center gap-2 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-4 pt-2 bg-slate-50/40 text-xs">
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'json'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5" />
              <span>Destinations ({places.length})</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'images'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images Folder</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('osm')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'osm'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5" />
              <span>OpenStreetMap</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  ref={jsonFileInputRef}
                  onChange={handleJsonUpload}
                  accept=".json,application/json"
                  className="hidden"
                />

                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="flex-1 min-w-[130px] p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import JSON</span>
                </button>

                <button
                  onClick={handleExportJson}
                  className="flex-1 min-w-[130px] p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={handleResetToDefault}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  title="Reset to default dataset"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>

              {/* JSON preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">Current JSON Preview ({places.length} spots):</span>
                </div>
                <div className="bg-slate-950 text-emerald-400 p-3 rounded-2xl font-mono text-[11px] h-52 overflow-y-auto border border-slate-800">
                  <pre>{JSON.stringify(places.slice(0, 3), null, 2)}</pre>
                  {places.length > 3 && (
                    <div className="text-slate-500 mt-2">
                      ... + {places.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={imageFileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Kolkata Pandal Photos (public/images/)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    All images from user data are stored locally in the public folder.
                  </p>
                </div>
                <button
                  onClick={() => imageFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photos</span>
                </button>
              </div>

              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {places.slice(0, 12).map((place) => (
                  <div
                    key={place.id}
                    className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group"
                  >
                    <img
                      src={getSafeImageUrl(place.image)}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-1 text-[9px] text-white truncate text-center">
                      {place.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'osm' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-emerald-600" />
                  <span>OpenStreetMap Engine</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  OpenStreetMap provides real-time mapping for all {places.length} Kolkata Durga Puja pandals with complete attribution.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
