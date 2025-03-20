import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useWarehouses } from '../../hooks/useWarehouses';
import { supabase } from '../../lib/supabase';
import { AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  images: { id?: string; url: string; order: number }[];
  warehouseId?: string;
  onChange: (images: { url: string; order: number }[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, warehouseId, onChange, maxImages = 5 }: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { deleteWarehouseImage } = useWarehouses();

  const uploadImage = async (file: File, order: number) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `temp/${Math.random()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('warehouse-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('warehouse-images')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      order
    };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadPromises = files.map((file, index) => 
        uploadImage(file, images.length + index)
      );

      const newImages = await Promise.all(uploadPromises);
      onChange([...images, ...newImages]);
    } catch (err) {
      console.error('Failed to upload images:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    try {
      const image = images[index];
      
      // If the image has an ID and warehouse ID, delete it from the database
      if (image.id && warehouseId) {
        await deleteWarehouseImage(image.id, warehouseId);
      }
      
      const updatedImages = images.filter((_, i) => i !== index);
      // Reorder remaining images
      const reorderedImages = updatedImages.map((img, i) => ({
        ...img,
        order: i,
      }));
      onChange(reorderedImages);

      // Delete the file from storage if it exists
      if (image.url) {
        const url = new URL(image.url);
        const path = url.pathname.split('/').slice(-2).join('/');
        await supabase.storage
          .from('warehouse-images')
          .remove([path]);
      }
    } catch (err) {
      setError('Failed to delete image');
      console.error('Failed to delete image:', err);
    }
  };


  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={image.url}
              alt={`Warehouse image ${index + 1}`}
              className="h-40 w-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <label className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
            <Upload className="h-8 w-8 text-gray-400" />
            <span className="mt-2 text-sm text-gray-500">
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <p className="text-sm text-gray-500">
        Upload up to {maxImages} images. Supported formats: JPG, PNG.
      </p>
    </div>
  );
}