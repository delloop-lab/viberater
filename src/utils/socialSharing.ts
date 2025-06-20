// Social media sharing functions
export const handleTwitterShare = (imgurUrl: string, statement: string) => {
  console.log('🐦 Twitter share clicked');
  console.log('📸 Image URL:', imgurUrl);
  console.log('💬 Statement:', statement);
  
  const text = encodeURIComponent(statement);
  const url = encodeURIComponent(imgurUrl || window.location.href);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  
  console.log('🔗 Twitter URL:', twitterUrl);
  window.open(twitterUrl, '_blank', 'width=600,height=400');
};

export const handleFacebookShare = (imgurUrl: string, statement: string) => {
  console.log('📘 Facebook share clicked');
  console.log('📸 Image URL:', imgurUrl);
  console.log('💬 Statement:', statement);
  
  const url = encodeURIComponent(imgurUrl || window.location.href);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  
  console.log('🔗 Facebook URL:', facebookUrl);
  window.open(facebookUrl, '_blank', 'width=600,height=400');
};

export const handleInstagramShare = (imgurUrl: string, statement: string) => {
  console.log('📷 Instagram share clicked');
  console.log('📸 Image URL:', imgurUrl);
  console.log('💬 Statement:', statement);
  
  if (imgurUrl) {
    // Instagram doesn't support direct sharing via URL, so we'll copy the image URL
    navigator.clipboard.writeText(imgurUrl).then(() => {
      alert('Image URL copied! Open Instagram and paste it to share.');
    }).catch(() => {
      alert('Please copy this URL and share it on Instagram: ' + imgurUrl);
    });
  } else {
    alert('Please wait for the image to upload before sharing to Instagram.');
  }
};

export const handleWhatsAppShare = (imgurUrl: string, statement: string) => {
  console.log('📱 WhatsApp share clicked');
  console.log('📸 Image URL:', imgurUrl);
  console.log('💬 Statement:', statement);
  
  const text = encodeURIComponent(statement);
  const url = encodeURIComponent(imgurUrl || window.location.href);
  const whatsappUrl = `https://wa.me/?text=${text}%20${url}`;
  
  console.log('🔗 WhatsApp URL:', whatsappUrl);
  window.open(whatsappUrl, '_blank');
};

export const handleTelegramShare = (imgurUrl: string, statement: string) => {
  console.log('📬 Telegram share clicked');
  console.log('📸 Image URL:', imgurUrl);
  console.log('💬 Statement:', statement);
  
  const text = encodeURIComponent(statement);
  const url = encodeURIComponent(imgurUrl || window.location.href);
  const telegramUrl = `https://t.me/share/url?url=${url}&text=${text}`;
  
  console.log('🔗 Telegram URL:', telegramUrl);
  window.open(telegramUrl, '_blank');
};

export const handleLinkedInShare = (imgurUrl: string, statement: string) => {
  console.log('💼 LinkedIn share clicked');
  console.log('📸 Image URL:', imgurUrl);
  console.log('💬 Statement:', statement);
  
  const text = encodeURIComponent(statement);
  const url = encodeURIComponent(imgurUrl || window.location.href);
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  
  console.log('🔗 LinkedIn URL:', linkedinUrl);
  window.open(linkedinUrl, '_blank', 'width=600,height=400');
}; 