import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyzeComponentImage } from '@/services/aiService';
import { toast } from 'sonner';

interface ImageUploadProps {
  onValuesExtracted: (values: any) => void;
}

export const ImageUpload = ({ onValuesExtracted }: ImageUploadProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const data = await analyzeComponentImage(file);
      onValuesExtracted(data);
      toast.success("Component analyzed successfully!");
    } catch (error) {
      toast.error("Failed to analyze image. Please try manually.");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mt-4 p-4 border-2 border-dashed border-border rounded-lg bg-secondary/30">
      <input
        type="file"
        id="component-upload"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <label htmlFor="component-upload" className="cursor-pointer flex flex-col items-center gap-2">
        {isAnalyzing ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : (
          <Upload className="w-8 h-8 text-muted-foreground" />
        )}
        <span className="text-xs font-mono uppercase tracking-tighter">
          {isAnalyzing ? "AI Analyzing..." : "Upload Component Image"}
        </span>
      </label>
    </div>
  );
};