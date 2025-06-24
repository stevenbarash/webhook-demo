document.addEventListener('DOMContentLoaded', function () {
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // Clear all button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all webhook data?')) {
        // Get namespace from URL
        let namespace = window.location.pathname.split('/')[2];
        if (!namespace) namespace = 'default';
        await fetch(`/api/webhooks/${namespace}`, { method: 'DELETE' });
        window.location.reload();
      }
    });
  }

  // Copy webhook URL
  const copyUrlBtn = document.getElementById('copyUrl');
  const webhookUrl = document.getElementById('webhookUrl');
  if (copyUrlBtn && webhookUrl) {
    copyUrlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(webhookUrl.textContent);
      copyUrlBtn.textContent = '✅ Copied!';
      setTimeout(() => {
        copyUrlBtn.textContent = '📋 Copy';
      }, 1200);
    });
  }

  // Toggle payload display
  document.querySelectorAll('.toggle-payload').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = btn.getAttribute('data-id');
      const payloadDiv = document.getElementById('payload-' + id);
      if (payloadDiv) {
        payloadDiv.style.display = payloadDiv.style.display === 'none' ? 'block' : 'none';
      }
    });
  });
}); 