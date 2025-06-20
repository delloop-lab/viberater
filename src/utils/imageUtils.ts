import html2canvas from 'html2canvas';

// Image processing and utility functions
export const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setImageUrl: (url: string) => void, setImgLoaded: (loaded: boolean) => void) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageUrl(result);
      setImgLoaded(false);
    };
    reader.readAsDataURL(file);
  }
};

export const handleDownload = async (shareRef: React.RefObject<HTMLDivElement>, statement: string) => {
  if (!shareRef.current) {
    console.error('❌ No share reference found');
    return;
  }

  try {
    console.log('📥 Starting download process...');
    
    const canvas = await html2canvas(shareRef.current, {
      scale: 2, // Higher quality
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (document) => {
        // Preserve rounded corners on the cloned element
        const clonedImage = document.querySelector('.selfie-image-container img');
        if (clonedImage) {
          (clonedImage as HTMLElement).style.borderRadius = '20px';
        }
      },
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Create unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `viberater-${timestamp}.jpg`;
    
    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Download completed:', filename);
  } catch (error) {
    console.error('❌ Download failed:', error);
    alert('Download failed. Please try again.');
  }
};

export const handleCopy = async (shareRef: React.RefObject<HTMLDivElement>, statement: string) => {
  if (!shareRef.current) {
    console.error('❌ No share reference found');
    return;
  }

  try {
    console.log('📋 Starting copy process...');
    
    // Try to copy the image to clipboard
    const canvas = await html2canvas(shareRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (document) => {
        const clonedImage = document.querySelector('.selfie-image-container img');
        if (clonedImage) {
          (clonedImage as HTMLElement).style.borderRadius = '20px';
        }
      },
    });

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.9);
    });

    // Try to copy image to clipboard
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/jpeg': blob
        })
      ]);
      console.log('✅ Image copied to clipboard successfully');
      alert('Image copied to clipboard!');
    } catch (clipboardError) {
      console.log('⚠️ Image copy failed, falling back to text copy:', clipboardError);
      
      // Fallback: copy text only
      try {
        await navigator.clipboard.writeText(statement);
        console.log('✅ Text copied to clipboard as fallback');
        alert('Roast text copied to clipboard!');
      } catch (textError) {
        console.error('❌ Text copy also failed:', textError);
        alert('Copy failed. Please try again.');
      }
    }
  } catch (error) {
    console.error('❌ Copy process failed:', error);
    alert('Copy failed. Please try again.');
  }
};

export const autoUploadToCloudinary = async (
  shareRef: React.RefObject<HTMLDivElement>, 
  setImgurUrl: (url: string) => void, 
  setIsUploading: (uploading: boolean) => void
) => {
  if (!shareRef.current) {
    console.error('❌ No share reference found for upload');
    return;
  }

  try {
    console.log('⏳ Starting auto-upload process...');
    setIsUploading(true);

    const canvas = await html2canvas(shareRef.current, {
      scale: 2, // Match download quality
      useCORS: true,
      backgroundColor: '#ffffff', // Match download background
      onclone: (document) => {
        // Preserve rounded corners on the cloned element, matching download
        const clonedImage = document.querySelector('.selfie-image-container img');
        if (clonedImage) {
          (clonedImage as HTMLElement).style.borderRadius = '20px';
        }
      },
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use jpeg for smaller size

    // Fallback if dataUrl is empty
    if (!dataUrl || dataUrl === 'data:,') {
      console.error('❌ Generated dataUrl is empty');
      setIsUploading(false);
      return;
    }

    console.log('📤 Uploading to Cloudinary...');
    
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', blob, 'viberater.jpg');
    formData.append('upload_preset', 'ml_default'); // Use your Cloudinary upload preset

    // Upload to Cloudinary
    const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Cloudinary upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('📸 Cloudinary upload result:', uploadResult);

    if (uploadResult.secure_url) {
      setImgurUrl(uploadResult.secure_url);
      console.log('✅ Image uploaded successfully:', uploadResult.secure_url);
    } else {
      console.error('❌ Cloudinary upload failed - no secure_url');
      throw new Error('Upload failed - no secure URL returned');
    }

  } catch (error) {
    console.error('❌ Auto-upload failed:', error);
    
    // Generate fallback dataURL for sharing
    try {
      const canvas = await html2canvas(shareRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (document) => {
          const clonedImage = document.querySelector('.selfie-image-container img');
          if (clonedImage) {
            (clonedImage as HTMLElement).style.borderRadius = '20px';
          }
        },
      });
      const fallbackDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImgurUrl(fallbackDataUrl);
      console.log('🔄 Using fallback dataURL for sharing');
    } catch (fallbackError) {
      console.error('❌ Fallback dataURL generation also failed:', fallbackError);
    }
  } finally {
    setIsUploading(false);
  }
}; 