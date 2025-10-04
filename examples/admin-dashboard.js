const express = require('express');
const { TrialAbuseGuard } = require('trial-abuse-guard');

// Example: Admin dashboard for managing temp email domains
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Initialize guard
const guard = new TrialAbuseGuard({
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 24
});

// Admin dashboard HTML
const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Trial Abuse Guard - Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: #f5f5f5; padding: 15px; border-radius: 5px; flex: 1; }
        .actions { margin: 20px 0; }
        .btn { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 3px; cursor: pointer; margin: 5px; }
        .btn.danger { background: #dc3545; }
        .btn.success { background: #28a745; }
        .domain-list { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; }
        .search-box { width: 100%; padding: 10px; margin: 10px 0; }
        .result { margin: 10px 0; padding: 10px; background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Trial Abuse Guard - Admin Dashboard</h1>
        
        <div class="stats">
            <div class="stat-card">
                <h3>Total Domains</h3>
                <div id="totalDomains">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Last Update</h3>
                <div id="lastUpdate">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Auto Update</h3>
                <div id="autoUpdate">Loading...</div>
            </div>
        </div>

        <div class="actions">
            <button class="btn" onclick="forceUpdate()">🔄 Force Update</button>
            <button class="btn success" onclick="exportDomains('json')">📥 Export JSON</button>
            <button class="btn success" onclick="exportDomains('txt')">📥 Export TXT</button>
            <input type="file" id="importFile" accept=".txt,.json" style="display:none" onchange="importDomains()">
            <button class="btn" onclick="document.getElementById('importFile').click()">📤 Import</button>
        </div>

        <h3>Search Domains</h3>
        <input type="text" class="search-box" id="searchInput" placeholder="Search domains..." onkeyup="searchDomains()">
        <div id="searchResults"></div>

        <h3>Add Custom Domain</h3>
        <input type="text" id="newDomain" placeholder="Enter domain (e.g., suspicious.com)">
        <button class="btn" onclick="addDomain()">➕ Add Domain</button>

        <h3>Recent Test Results</h3>
        <div id="testResults"></div>

        <h3>Test Email</h3>
        <input type="email" id="testEmail" placeholder="Enter email to test">
        <button class="btn" onclick="testEmail()">🧪 Test Email</button>
    </div>

    <script>
        // Load dashboard data
        async function loadDashboard() {
            try {
                const response = await fetch('/api/admin/stats');
                const stats = await response.json();
                
                document.getElementById('totalDomains').textContent = stats.totalDomains.toLocaleString();
                document.getElementById('lastUpdate').textContent = stats.lastUpdate ? 
                    new Date(stats.lastUpdate).toLocaleString() : 'Never';
                document.getElementById('autoUpdate').textContent = stats.autoUpdateEnabled ? 'Enabled' : 'Disabled';
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        async function forceUpdate() {
            try {
                await fetch('/api/admin/update', { method: 'POST' });
                alert('Update initiated! This may take a few minutes.');
                setTimeout(loadDashboard, 2000);
            } catch (error) {
                alert('Update failed: ' + error.message);
            }
        }

        async function exportDomains(format) {
            try {
                const response = await fetch(\`/api/admin/export?format=\${format}\`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`temp-domains.\${format}\`;
                a.click();
            } catch (error) {
                alert('Export failed: ' + error.message);
            }
        }

        async function importDomains() {
            const file = document.getElementById('importFile').files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/admin/import', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                alert(\`Imported \${result.count} domains\`);
                loadDashboard();
            } catch (error) {
                alert('Import failed: ' + error.message);
            }
        }

        async function searchDomains() {
            const query = document.getElementById('searchInput').value;
            if (query.length < 2) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }

            try {
                const response = await fetch(\`/api/admin/search?q=\${encodeURIComponent(query)}\`);
                const domains = await response.json();
                
                const resultsDiv = document.getElementById('searchResults');
                resultsDiv.innerHTML = domains.slice(0, 20).map(domain => 
                    \`<div class="result">\${domain} <button class="btn danger" onclick="removeDomain('\${domain}')">Remove</button></div>\`
                ).join('');
            } catch (error) {
                console.error('Search failed:', error);
            }
        }

        async function addDomain() {
            const domain = document.getElementById('newDomain').value.trim();
            if (!domain) return;

            try {
                await fetch('/api/admin/domains', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domains: [domain] })
                });
                alert('Domain added successfully');
                document.getElementById('newDomain').value = '';
                loadDashboard();
            } catch (error) {
                alert('Failed to add domain: ' + error.message);
            }
        }

        async function removeDomain(domain) {
            if (!confirm(\`Remove \${domain}?\`)) return;

            try {
                await fetch('/api/admin/domains', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domains: [domain] })
                });
                alert('Domain removed successfully');
                searchDomains(); // Refresh search
                loadDashboard();
            } catch (error) {
                alert('Failed to remove domain: ' + error.message);
            }
        }

        async function testEmail() {
            const email = document.getElementById('testEmail').value.trim();
            if (!email) return;

            try {
                const response = await fetch('/api/test-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, ip: '203.0.113.1' })
                });
                const result = await response.json();
                
                const resultsDiv = document.getElementById('testResults');
                const emoji = result.factors.tempEmail.detected ? '🚫' : '✅';
                const timestamp = new Date().toLocaleString();
                
                resultsDiv.innerHTML = \`
                    <div class="result">
                        <strong>\${emoji} \${email}</strong> - \${result.factors.tempEmail.detected ? 'TEMP EMAIL' : 'LEGITIMATE'}<br>
                        Risk Score: \${result.overall}/100 | Recommendation: \${result.recommendation.toUpperCase()}<br>
                        <small>Tested at \${timestamp}</small>
                    </div>
                \` + resultsDiv.innerHTML;
            } catch (error) {
                alert('Test failed: ' + error.message);
            }
        }

        // Load dashboard on page load
        loadDashboard();
    </script>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
  res.send(dashboardHTML);
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = guard.getTempEmailStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/update', async (req, res) => {
  try {
    await guard.updateTempEmailDomains();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/search', async (req, res) => {
  try {
    const query = req.query.q;
    const domains = guard.searchTempEmailDomains(query);
    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/domains', async (req, res) => {
  try {
    const { domains } = req.body;
    await guard.addTempEmailDomains(domains);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/domains', async (req, res) => {
  try {
    const { domains } = req.body;
    await guard.removeTempEmailDomains(domains);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const tempFile = \`./temp-export.\${format}\`;
    
    await guard.exportTempEmailDomains(tempFile, format);
    res.download(tempFile, \`temp-domains.\${format}\`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/import', async (req, res) => {
  try {
    // Handle file upload (you'd need multer middleware in production)
    const count = await guard.importTempEmailDomains(req.file.path);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-email', async (req, res) => {
  try {
    const { email, ip } = req.body;
    const result = await guard.checkUser(email, ip || '203.0.113.1');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`🚀 Admin Dashboard running at http://localhost:\${PORT}\`);
  console.log('📊 Use the dashboard to manage temp email domains');
});