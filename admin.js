        // 管理密码
        const API_URL = 'https://1340181402-6rjxdina8v.ap-guangzhou.tencentscf.com';
        const SESSION_KEY = 'admin_session';
        
        // 页面加载时检查登录状态
        window.addEventListener('DOMContentLoaded', () => {
            if (!checkLoginStatus()) {
                // 未登录，显示登录页面
                document.getElementById('loginPage').style.display = 'flex';
                // 聚焦到密码输入框
                setTimeout(() => {
                    document.getElementById('loginPassword').focus();
                }, 100);
            }
        });
        // 切换标签页
        function getAdminSession() {
            const session = localStorage.getItem(SESSION_KEY);
            if (!session) return null;

            try {
                const sessionData = JSON.parse(session);
                if (sessionData.token && sessionData.expiry && Date.now() < sessionData.expiry) {
                    return sessionData;
                }
            } catch (error) {
                console.warn('管理会话解析失败:', error);
            }

            localStorage.removeItem(SESSION_KEY);
            return null;
        }

        function clearAdminSession() {
            localStorage.removeItem(SESSION_KEY);
        }

        function showLoginPage() {
            document.getElementById('mainContent').classList.remove('show');
            document.getElementById('loginPage').style.display = 'flex';
        }

        function handleUnauthorized(message = '登录已失效，请重新登录') {
            clearAdminSession();
            showLoginPage();
            alert(message);
        }

        async function apiRawRequest(action, data = {}) {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            return await response.json();
        }

        function checkLoginStatus() {
            const session = getAdminSession();
            if (session) {
                showMainContent();
                return true;
            }
            return false;
        }

        async function handleLogin(event) {
            event.preventDefault();

            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');

            try {
                const result = await apiRawRequest('adminLogin', { password });

                if (result.success) {
                    const sessionData = {
                        loggedIn: true,
                        token: result.data.token,
                        expiry: result.data.expiresAt
                    };

                    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
                    showMainContent();
                    document.getElementById('loginPassword').value = '';
                    errorDiv.classList.remove('show');
                    initializeAdminTabs();
                } else {
                    errorDiv.classList.add('show');
                    errorDiv.textContent = result.message || '密码错误，请重试';
                    document.getElementById('loginPassword').value = '';
                    document.getElementById('loginPassword').focus();
                }
            } catch (error) {
                console.error('登录失败:', error);
                errorDiv.classList.add('show');
                errorDiv.textContent = '登录失败，请检查网络后重试';
            }

            return false;
        }

        function showMainContent() {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('mainContent').classList.add('show');
        }

        function logout() {
            if (confirm('确定要退出登录吗？')) {
                clearAdminSession();
                location.reload();
            }
        }

        async function apiRequest(action, data = {}) {
            try {
                const session = getAdminSession();
                if (!session) {
                    handleUnauthorized();
                    return { success: false, error: 'UNAUTHORIZED' };
                }

                const result = await apiRawRequest(action, {
                    adminToken: session.token,
                    ...data
                });

                if (!result.success && result.error === 'UNAUTHORIZED') {
                    handleUnauthorized(result.message || '登录已失效，请重新登录');
                }

                return result;
            } catch (error) {
                console.error('API 请求失败:', error);
                alert('网络错误：' + error.message);
                return { success: false, error: error.message };
            }
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function encodeDataValue(value) {
            return encodeURIComponent(String(value ?? ''));
        }

        function decodeDataValue(value) {
            return decodeURIComponent(String(value ?? ''));
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-6px)';
            }, 2600);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        function updatePageMeta(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        function setButtonBusy(button, busy, busyText) {
            if (!button) return;

            if (!button.dataset.originalText) {
                button.dataset.originalText = button.innerHTML;
            }

            button.disabled = busy;
            button.classList.toggle('is-busy', busy);
            button.innerHTML = busy ? busyText : button.dataset.originalText;
        }

        function setLoginError(message = '') {
            const errorDiv = document.getElementById('loginError');
            if (!errorDiv) return;

            if (message) {
                errorDiv.textContent = message;
                errorDiv.classList.add('show');
            } else {
                errorDiv.textContent = '';
                errorDiv.classList.remove('show');
            }
        }

        function getTabButton(tabName) {
            return Array.from(document.querySelectorAll('.tab')).find((tab) => {
                const onclickValue = tab.getAttribute('onclick') || '';
                return onclickValue.includes(`showTab('${tabName}')`);
            });
        }

        function initializeAdminTabs() {
            const savedTab = localStorage.getItem('adminCurrentTab') || 'dashboard';
            const tabs = document.querySelectorAll('.tab');
            let targetTab = null;

            tabs.forEach(tab => {
                const tabName = tab.getAttribute('onclick')?.match(/showTab\('(.+?)'\)/)?.[1];
                if (tabName === savedTab) {
                    targetTab = tab;
                }
            });

            if (targetTab) {
                tabs.forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
                targetTab.classList.add('active');

                const pageElement = document.getElementById('page-' + savedTab);
                if (pageElement) {
                    pageElement.classList.add('active');
                }

                if (savedTab === 'dashboard') loadDashboard();
                else if (savedTab === 'licenses') loadLicenses();
                else if (savedTab === 'config') loadGlobalConfig();
                else if (savedTab === 'trial') loadTrialDevices();
                else if (savedTab === 'logs') loadLogs();
                else if (savedTab === 'features') loadFeatureConfig();
                else if (savedTab === 'stats') {
                    initStatsPage();
                    loadUsageStats();
                }
            } else {
                loadDashboard();
            }
        }

        function showTab(tabName) {
            // 更新标签按钮
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // 更新页面
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById('page-' + tabName).classList.add('active');
            
            // 保存当前标签页到localStorage
            localStorage.setItem('adminCurrentTab', tabName);
            
            // 加载数据
            if (tabName === 'dashboard') loadDashboard();
            else if (tabName === 'licenses') loadLicenses();
            else if (tabName === 'config') loadGlobalConfig();
            else if (tabName === 'trial') loadTrialDevices();
            else if (tabName === 'logs') loadLogs();
            else if (tabName === 'features') loadFeatureConfig();
            else if (tabName === 'stats') {
                initStatsPage();
                loadUsageStats();
            }
        }

        // 加载仪表盘
        async function loadDashboard() {
            const result = await apiRequest('getStats');
            
            if (result.success) {
                const stats = result.data;
                document.getElementById('totalLicenses').textContent = stats.totalLicenses;
                document.getElementById('activeLicenses').textContent = stats.activeLicenses;
                document.getElementById('boundDevices').textContent = stats.boundDevices;
                document.getElementById('trialDevices').textContent = stats.trialDevices;
            }
        }

        // 批量生成密钥
        let generatedLicensesCache = [];
        
        async function batchGenerateLicenses() {
            const count = parseInt(document.getElementById('licenseCount').value);
            const days = parseInt(document.getElementById('expireDays').value);
            const popupMessage = document.getElementById('popupMessage').value.trim();
            
            if (!count || count <= 0) {
                alert('请输入有效的生成数量');
                return;
            }
            
            if (count > 1000) {
                alert('单次最多生成1000个密钥');
                return;
            }
            
            const result = await apiRequest('batchGenerateLicenses', { 
                count, 
                days,
                popupMessage
            });
            
            if (result.success) {
                generatedLicensesCache = result.data.licenses;
                
                document.getElementById('generatedCount').textContent = result.data.count;
                document.getElementById('generatedDays').textContent = result.data.isPermanent ? '永久' : result.data.days + '天';
                document.getElementById('generatedExpire').textContent = 
                    result.data.isPermanent ? '永久有效' : '激活后' + result.data.days + '天';
                
                // 显示密钥列表
                const listHtml = generatedLicensesCache.map((lic, index) => 
                    `${index + 1}. ${lic}`
                ).join('<br>');
                document.getElementById('licensesList').innerHTML = listHtml;
                
                document.getElementById('generatedResult').style.display = 'block';
                
                loadDashboard();
            } else {
                alert('❌ 生成失败：' + result.error);
            }
        }

        // 导出密钥
        function exportLicenses(format) {
            if (generatedLicensesCache.length === 0) {
                alert('没有可导出的密钥');
                return;
            }
            
            const days = parseInt(document.getElementById('expireDays').value);
            const isPermanent = days === 0;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            let content, filename, mimeType;
            
            if (format === 'txt') {
                content = generatedLicensesCache.join('\n');
                filename = isPermanent ? `licenses-permanent-${timestamp}.txt` : `licenses-${days}days-${timestamp}.txt`;
                mimeType = 'text/plain';
            } else if (format === 'csv') {
                content = '密钥,有效期,说明,状态\n';
                const daysText = isPermanent ? '永久' : `${days}天`;
                const expireNote = isPermanent ? '永久有效' : `激活后${days}天`;
                generatedLicensesCache.forEach(lic => {
                    content += `${lic},${daysText},${expireNote},未使用\n`;
                });
                filename = isPermanent ? `licenses-permanent-${timestamp}.csv` : `licenses-${days}days-${timestamp}.csv`;
                mimeType = 'text/csv';
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            alert(`✅ 已导出 ${generatedLicensesCache.length} 个密钥`);
        }

        // 复制全部密钥
        function copyAllLicenses() {
            if (generatedLicensesCache.length === 0) {
                alert('没有可复制的密钥');
                return;
            }
            
            const text = generatedLicensesCache.join('\n');
            navigator.clipboard.writeText(text).then(() => {
                alert(`✅ 已复制 ${generatedLicensesCache.length} 个密钥到剪贴板`);
            });
        }

        // 加载密钥列表
        let allLicensesCache = [];
        let currentLicensesPage = 1;
        const licensesPageSize = 20;
        
        async function loadLicenses() {
            const result = await apiRequest('listAllLicenses');
            
            if (!result.success) {
                document.getElementById('licensesTable').innerHTML = '<p>加载失败：' + result.error + '</p>';
                return;
            }
            
            allLicensesCache = result.data.licenses;
            currentLicensesPage = 1;
            renderLicenses(allLicensesCache);
        }
        
        function renderLicenses(licenses) {
            const start = (currentLicensesPage - 1) * licensesPageSize;
            const end = start + licensesPageSize;
            const pagedLicenses = licenses.slice(start, end);
            const totalPages = Math.ceil(licenses.length / licensesPageSize);
            
            let html = '<table><thead><tr><th>密钥</th><th>期限</th><th>状态</th><th>设备ID</th><th>创建时间</th><th>激活时间</th><th>过期时间</th><th>剩余天数</th><th>配置</th><th>操作</th></tr></thead><tbody>';
            
            pagedLicenses.forEach(lic => {
                const now = Date.now();
                const isPermanent = lic.days === 0;
                const daysLeft = isPermanent ? Infinity : (lic.expireTime ? Math.ceil((lic.expireTime - now) / (1000 * 60 * 60 * 24)) : lic.days);
                
                let statusBadge;
                if (lic.isExpired) {
                    statusBadge = '<span class="badge badge-danger">已过期</span>';
                } else if (lic.status === 'unused') {
                    statusBadge = '<span class="badge badge-success">未使用</span>';
                } else if (lic.status === 'activated') {
                    statusBadge = '<span class="badge badge-warning">已激活</span>';
                }
                
                let daysLeftBadge = '';
                if (isPermanent) {
                    daysLeftBadge = '<span class="badge badge-success">永久</span>';
                } else if (lic.status === 'unused') {
                    daysLeftBadge = `<span class="badge badge-success">激活后${lic.days}天</span>`;
                } else if (!lic.isExpired) {
                    if (daysLeft <= 7) {
                        daysLeftBadge = `<span class="badge badge-danger">${daysLeft}天</span>`;
                    } else if (daysLeft <= 30) {
                        daysLeftBadge = `<span class="badge badge-warning">${daysLeft}天</span>`;
                    } else {
                        daysLeftBadge = `<span class="badge badge-success">${daysLeft}天</span>`;
                    }
                }
                
                const periodText = isPermanent ? '永久' : `${lic.days}天`;
                const activatedTime = lic.status === 'unused' ? '-' : (lic.activatedAt || '-');
                const expireDisplay = lic.status === 'unused' ? '待激活' : lic.expire;
                
                // 配置信息显示
                const hasConfig = lic.popupMessage || lic.purchaseUrl;
                const configBadge = hasConfig ? '<span class="badge badge-success">已配置</span>' : '<span class="badge badge-secondary">未配置</span>';
                
                html += `<tr>
                    <td style="font-family: monospace; font-size: 11px;">${lic.license}</td>
                    <td>${periodText}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family: monospace; font-size: 10px;">${lic.deviceId}</td>
                    <td>${lic.created}</td>
                    <td>${activatedTime}</td>
                    <td>${expireDisplay}</td>
                    <td>${daysLeftBadge}</td>
                    <td>${configBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editLicenseConfig('${lic.license}', \`${(lic.popupMessage || '').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">配置</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteLicense('${lic.license}')">删除</button>
                    </td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            
            // 添加翻页控件
            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage - 1})" ${currentLicensesPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLicensesPage} / ${totalPages} 页 (共 ${licenses.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage + 1})" ${currentLicensesPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }
            
            document.getElementById('licensesTable').innerHTML = html;
        }
        
        function changeLicensesPage(page) {
            const totalPages = Math.ceil(allLicensesCache.length / licensesPageSize);
            if (page < 1 || page > totalPages) return;
            currentLicensesPage = page;
            renderLicenses(allLicensesCache);
        }
        
        function filterLicenses() {
            const statusFilter = document.getElementById('filterStatus').value;
            const daysFilter = document.getElementById('filterDays').value;
            
            let filtered = allLicensesCache;
            
            if (statusFilter !== 'all') {
                if (statusFilter === 'expired') {
                    filtered = filtered.filter(l => l.isExpired);
                } else {
                    filtered = filtered.filter(l => l.status === statusFilter && !l.isExpired);
                }
            }
            
            if (daysFilter !== 'all') {
                filtered = filtered.filter(l => l.days === parseInt(daysFilter));
            }
            
            currentLicensesPage = 1;
            renderLicenses(filtered);
        }
        
        function exportAllLicenses(format = 'csv') {
            if (allLicensesCache.length === 0) {
                alert('没有可导出的密钥');
                return;
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            let content, filename, mimeType;
            
            if (format === 'txt') {
                content = allLicensesCache.map(lic => lic.license).join('\n');
                filename = `all-licenses-${timestamp}.txt`;
                mimeType = 'text/plain';
            } else {
                content = '密钥,期限,状态,设备ID,创建时间,过期时间\n';
                
                allLicensesCache.forEach(lic => {
                    const status = lic.isExpired ? '已过期' : (lic.status === 'unused' ? '未使用' : '已激活');
                    const periodText = (lic.isPermanent || lic.days === 0) ? '永久' : `${lic.days}天`;
                    content += `${lic.license},${periodText},${status},${lic.deviceId},${lic.created},${lic.expire}\n`;
                });
                
                filename = `all-licenses-${timestamp}.csv`;
                mimeType = 'text/csv';
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            alert(`✅ 已导出 ${allLicensesCache.length} 个密钥`);
        }

        // 加载试用设备
        let currentTrialPage = 1;
        const trialPageSize = 20;
        let allTrialDevices = [];
        
        async function loadTrialDevices() {
            const result = await apiRequest('listTrialDevices');
            
            if (!result.success) {
                document.getElementById('trialTable').innerHTML = '<p>加载失败：' + result.error + '</p>';
                return;
            }
            
            allTrialDevices = result.data.devices || [];
            currentTrialPage = 1;
            renderTrialDevices();
        }
        
        function renderTrialDevices() {
            const start = (currentTrialPage - 1) * trialPageSize;
            const end = start + trialPageSize;
            const pagedDevices = allTrialDevices.slice(start, end);
            const totalPages = Math.ceil(allTrialDevices.length / trialPageSize);
            
            let html = '<table><thead><tr><th>设备ID</th><th>剩余次数</th><th>首次使用</th><th>最后使用</th><th>IP地址</th><th>操作</th></tr></thead><tbody>';
            
            pagedDevices.forEach(device => {
                html += `<tr>
                    <td style="font-family: monospace; font-size: 11px;">${device.deviceId}</td>
                    <td><span class="badge ${device.remainingTasks > 5 ? 'badge-success' : device.remainingTasks > 0 ? 'badge-warning' : 'badge-danger'}">${device.remainingTasks} 次</span></td>
                    <td>${device.firstSeen}</td>
                    <td>${device.lastSeen}</td>
                    <td>${device.lastIP}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="resetTrialTasks('${device.deviceId}', 10)" style="margin-bottom: 5px;">重置为10次</button>
                        <button class="btn btn-secondary btn-sm" onclick="resetTrialTasks('${device.deviceId}', 20)" style="margin-bottom: 5px;">重置为20次</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTrialDevice('${device.deviceId}')">删除设备</button>
                    </td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            
            // 添加翻页控件
            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeTrialPage(${currentTrialPage - 1})" ${currentTrialPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentTrialPage} / ${totalPages} 页 (共 ${allTrialDevices.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeTrialPage(${currentTrialPage + 1})" ${currentTrialPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }
            
            if (allTrialDevices.length === 0) {
                html = '<p style="text-align: center; color: #999; padding: 40px;">暂无试用设备</p>';
            }
            
            document.getElementById('trialTable').innerHTML = html;
        }
        
        function changeTrialPage(page) {
            const totalPages = Math.ceil(allTrialDevices.length / trialPageSize);
            if (page < 1 || page > totalPages) return;
            currentTrialPage = page;
            renderTrialDevices();
        }

        // 重置试用次数
        async function resetTrialTasks(deviceId, tasks) {
            if (!confirm(`确定要将设备 ${deviceId.substring(0, 16)}... 的试用次数重置为 ${tasks} 次吗？`)) {
                return;
            }

            const result = await apiRequest('resetTrialTasks', { deviceId, tasks });

            if (result.success) {
                alert(`✅ 重置成功！\n\n设备ID: ${deviceId.substring(0, 16)}...\n原次数: ${result.data.oldTasks} 次\n新次数: ${result.data.newTasks} 次`);
                loadTrialDevices(); // 重新加载列表
            } else {
                alert('❌ 重置失败：' + result.error);
            }
        }

        // 删除试用设备
        async function deleteTrialDevice(deviceId) {
            if (!confirm(`⚠️ 确定要删除设备吗？\n\n设备ID: ${deviceId.substring(0, 16)}...\n\n删除后该设备可以重新激活试用（10次）`)) {
                return;
            }

            const result = await apiRequest('deleteTrialDevice', { deviceId });

            if (result.success) {
                alert(`✅ 删除成功！\n\n设备ID: ${deviceId.substring(0, 16)}...\n原剩余次数: ${result.data.deletedTasks} 次\n\n该设备现在可以重新激活试用`);
                loadTrialDevices(); // 重新加载列表
            } else {
                alert('❌ 删除失败：' + result.error);
            }
        }

        // 加载操作日志
        let currentLogsPage = 1;
        const logsPageSize = 50;
        let allLogs = [];
        
        async function loadLogs() {
            const result = await apiRequest('getLogs', { page: 1, pageSize: 1000 });
            
            if (!result.success) {
                document.getElementById('logsTable').innerHTML = '<p>加载失败：' + result.error + '</p>';
                return;
            }
            
            const filterAction = document.getElementById('filterLogAction')?.value || 'all';
            allLogs = result.data.logs || [];
            
            // 筛选操作类型
            if (filterAction !== 'all') {
                allLogs = allLogs.filter(log => log.action === filterAction);
            }
            
            currentLogsPage = 1;
            renderLogs();
        }
        
        function renderLogs() {
            const start = (currentLogsPage - 1) * logsPageSize;
            const end = start + logsPageSize;
            const pagedLogs = allLogs.slice(start, end);
            const totalPages = Math.ceil(allLogs.length / logsPageSize);
            
            let html = '<table><thead><tr><th>时间</th><th>操作</th><th>详情</th><th>IP地址</th></tr></thead><tbody>';
            
            pagedLogs.forEach(log => {
                let actionText = '';
                let details = '';
                
                switch(log.action) {
                    case 'activate':
                        actionText = '<span class="badge badge-success">密钥激活</span>';
                        details = `密钥: ${log.license}<br>设备: ${log.deviceId}`;
                        break;
                    case 'trial_activate':
                        actionText = '<span class="badge badge-warning">试用激活</span>';
                        details = `设备: ${log.deviceId}`;
                        break;
                    case 'trial_task':
                        actionText = '<span class="badge badge-warning">试用任务</span>';
                        details = `设备: ${log.deviceId}<br>剩余: ${log.remainingTasks} 次`;
                        break;
                    case 'batch_generate':
                        actionText = '<span class="badge badge-success">批量生成</span>';
                        details = `数量: ${log.count} 个<br>期限: ${log.days} 天`;
                        break;
                    case 'delete':
                        actionText = '<span class="badge badge-danger">删除密钥</span>';
                        details = `密钥: ${log.license}`;
                        break;
                    default:
                        actionText = log.action;
                        details = JSON.stringify(log);
                }
                
                html += `<tr>
                    <td style="white-space: nowrap;">${log.timestamp}</td>
                    <td>${actionText}</td>
                    <td style="font-size: 11px;">${details}</td>
                    <td>${log.ip || '-'}</td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            
            // 添加翻页控件
            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLogsPage(${currentLogsPage - 1})" ${currentLogsPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLogsPage} / ${totalPages} 页 (共 ${allLogs.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLogsPage(${currentLogsPage + 1})" ${currentLogsPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }
            
            if (allLogs.length === 0) {
                html = '<p style="text-align: center; color: #999; padding: 40px;">暂无操作日志</p>';
            }
            
            document.getElementById('logsTable').innerHTML = html;
        }
        
        function changeLogsPage(page) {
            const totalPages = Math.ceil(allLogs.length / logsPageSize);
            if (page < 1 || page > totalPages) return;
            currentLogsPage = page;
            renderLogs();
        }

        // 编辑密钥配置
        function editLicenseConfig(license, currentMessage) {
            const message = prompt('请输入弹窗信息（留空则不显示弹窗）：', currentMessage || '');
            if (message === null) return; // 用户取消
            
            updateLicenseConfig(license, message);
        }
        
        // 更新密钥配置
        async function updateLicenseConfig(license, popupMessage) {
            const result = await apiRequest('updateLicenseConfig', { 
                license, 
                popupMessage
            });
            
            if (result.success) {
                alert('✅ 配置已更新');
                loadLicenses();
            } else {
                alert('❌ 更新失败：' + result.error);
            }
        }

        // 删除密钥
        async function deleteLicense(license) {
            if (!confirm('确定要删除此密钥吗？')) return;
            
            const result = await apiRequest('deleteLicense', { license });
            
            if (result.success) {
                alert('✅ 删除成功');
                loadLicenses();
                loadDashboard();
            } else {
                alert('❌ 删除失败：' + result.error);
            }
        }

        // 搜索表格
        function searchTable(tableId) {
            const input = event.target.value.toLowerCase();
            const table = document.getElementById(tableId);
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(input) ? '' : 'none';
            });
        }

        // ==================== 全局配置函数 ====================

        // 加载全局配置
        async function loadLicenses() {
            const result = await apiRequest('listAllLicenses');
            const tableEl = document.getElementById('licensesTable');
            
            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                return;
            }
            
            allLicensesCache = result.data.licenses;
            currentLicensesPage = 1;
            renderLicenses(allLicensesCache);
        }

        function renderLicenses(licenses) {
            const start = (currentLicensesPage - 1) * licensesPageSize;
            const end = start + licensesPageSize;
            const pagedLicenses = licenses.slice(start, end);
            const totalPages = Math.ceil(licenses.length / licensesPageSize);
            const tableEl = document.getElementById('licensesTable');
            
            let html = '<table><thead><tr><th>密钥</th><th>期限</th><th>状态</th><th>设备ID</th><th>创建时间</th><th>激活时间</th><th>过期时间</th><th>剩余天数</th><th>配置</th><th>操作</th></tr></thead><tbody>';
            
            pagedLicenses.forEach(lic => {
                const now = Date.now();
                const isPermanent = lic.days === 0;
                const daysLeft = isPermanent ? Infinity : (lic.expireTime ? Math.ceil((lic.expireTime - now) / (1000 * 60 * 60 * 24)) : lic.days);
                
                let statusBadge = '<span class="badge badge-secondary">未知</span>';
                if (lic.isExpired) {
                    statusBadge = '<span class="badge badge-danger">已过期</span>';
                } else if (lic.status === 'unused') {
                    statusBadge = '<span class="badge badge-success">未使用</span>';
                } else if (lic.status === 'activated') {
                    statusBadge = '<span class="badge badge-warning">已激活</span>';
                }
                
                let daysLeftBadge = '';
                if (isPermanent) {
                    daysLeftBadge = '<span class="badge badge-success">永久</span>';
                } else if (lic.status === 'unused') {
                    daysLeftBadge = `<span class="badge badge-success">激活后${escapeHtml(lic.days)}天</span>`;
                } else if (!lic.isExpired) {
                    if (daysLeft <= 7) {
                        daysLeftBadge = `<span class="badge badge-danger">${escapeHtml(daysLeft)}天</span>`;
                    } else if (daysLeft <= 30) {
                        daysLeftBadge = `<span class="badge badge-warning">${escapeHtml(daysLeft)}天</span>`;
                    } else {
                        daysLeftBadge = `<span class="badge badge-success">${escapeHtml(daysLeft)}天</span>`;
                    }
                }
                
                const periodText = isPermanent ? '永久' : `${escapeHtml(lic.days)}天`;
                const activatedTime = lic.status === 'unused' ? '-' : escapeHtml(lic.activatedAt || '-');
                const expireDisplay = lic.status === 'unused' ? '待激活' : escapeHtml(lic.expire);
                const hasConfig = !!lic.popupMessage;
                const configBadge = hasConfig ? '<span class="badge badge-success">已配置</span>' : '<span class="badge badge-secondary">未配置</span>';
                
                html += `<tr>
                    <td style="font-family: monospace; font-size: 11px;">${escapeHtml(lic.license)}</td>
                    <td>${periodText}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family: monospace; font-size: 10px;">${escapeHtml(lic.deviceId)}</td>
                    <td>${escapeHtml(lic.created)}</td>
                    <td>${activatedTime}</td>
                    <td>${expireDisplay}</td>
                    <td>${daysLeftBadge}</td>
                    <td>${configBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-license-config-btn" data-license="${encodeDataValue(lic.license)}" data-message="${encodeDataValue(lic.popupMessage || '')}">配置</button>
                        <button class="btn btn-sm btn-danger delete-license-btn" data-license="${encodeDataValue(lic.license)}">删除</button>
                    </td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            
            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage - 1})" ${currentLicensesPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLicensesPage} / ${totalPages} 页 (共 ${licenses.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage + 1})" ${currentLicensesPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }
            
            tableEl.innerHTML = html;

            tableEl.querySelectorAll('.edit-license-config-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    editLicenseConfig(
                        decodeDataValue(btn.dataset.license),
                        decodeDataValue(btn.dataset.message)
                    );
                });
            });

            tableEl.querySelectorAll('.delete-license-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    deleteLicense(decodeDataValue(btn.dataset.license));
                });
            });
        }

        async function loadTrialDevices() {
            const result = await apiRequest('listTrialDevices');
            const tableEl = document.getElementById('trialTable');
            
            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                return;
            }
            
            allTrialDevices = result.data.devices || [];
            currentTrialPage = 1;
            renderTrialDevices();
        }

        function renderTrialDevices() {
            const start = (currentTrialPage - 1) * trialPageSize;
            const end = start + trialPageSize;
            const pagedDevices = allTrialDevices.slice(start, end);
            const totalPages = Math.ceil(allTrialDevices.length / trialPageSize);
            const tableEl = document.getElementById('trialTable');
            
            let html = '<table><thead><tr><th>设备ID</th><th>剩余次数</th><th>首次使用</th><th>最后使用</th><th>IP地址</th><th>操作</th></tr></thead><tbody>';
            
            pagedDevices.forEach(device => {
                html += `<tr>
                    <td style="font-family: monospace; font-size: 11px;">${escapeHtml(device.deviceId)}</td>
                    <td><span class="badge ${device.remainingTasks > 5 ? 'badge-success' : device.remainingTasks > 0 ? 'badge-warning' : 'badge-danger'}">${escapeHtml(device.remainingTasks)} 次</span></td>
                    <td>${escapeHtml(device.firstSeen)}</td>
                    <td>${escapeHtml(device.lastSeen)}</td>
                    <td>${escapeHtml(device.lastIP)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm reset-trial-btn" data-device-id="${encodeDataValue(device.deviceId)}" data-tasks="10" style="margin-bottom: 5px;">重置为10次</button>
                        <button class="btn btn-secondary btn-sm reset-trial-btn" data-device-id="${encodeDataValue(device.deviceId)}" data-tasks="20" style="margin-bottom: 5px;">重置为20次</button>
                        <button class="btn btn-danger btn-sm delete-trial-btn" data-device-id="${encodeDataValue(device.deviceId)}">删除设备</button>
                    </td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            
            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeTrialPage(${currentTrialPage - 1})" ${currentTrialPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentTrialPage} / ${totalPages} 页 (共 ${allTrialDevices.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeTrialPage(${currentTrialPage + 1})" ${currentTrialPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }
            
            if (allTrialDevices.length === 0) {
                html = '<p style="text-align: center; color: #999; padding: 40px;">暂无试用设备</p>';
            }
            
            tableEl.innerHTML = html;

            tableEl.querySelectorAll('.reset-trial-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    resetTrialTasks(
                        decodeDataValue(btn.dataset.deviceId),
                        Number(btn.dataset.tasks)
                    );
                });
            });

            tableEl.querySelectorAll('.delete-trial-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    deleteTrialDevice(decodeDataValue(btn.dataset.deviceId));
                });
            });
        }

        async function loadLogs() {
            const result = await apiRequest('getLogs', { page: 1, pageSize: 1000 });
            const tableEl = document.getElementById('logsTable');
            
            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                return;
            }
            
            const filterAction = document.getElementById('filterLogAction')?.value || 'all';
            allLogs = result.data.logs || [];
            
            if (filterAction !== 'all') {
                allLogs = allLogs.filter(log => log.action === filterAction);
            }
            
            currentLogsPage = 1;
            renderLogs();
        }

        function renderLogs() {
            const start = (currentLogsPage - 1) * logsPageSize;
            const end = start + logsPageSize;
            const pagedLogs = allLogs.slice(start, end);
            const totalPages = Math.ceil(allLogs.length / logsPageSize);
            const tableEl = document.getElementById('logsTable');
            
            let html = '<table><thead><tr><th>时间</th><th>操作</th><th>详情</th><th>IP地址</th></tr></thead><tbody>';
            
            pagedLogs.forEach(log => {
                let actionText = escapeHtml(log.action);
                let details = escapeHtml(JSON.stringify(log));
                
                switch(log.action) {
                    case 'activate':
                        actionText = '<span class="badge badge-success">密钥激活</span>';
                        details = `密钥: ${escapeHtml(log.license)}<br>设备: ${escapeHtml(log.deviceId)}`;
                        break;
                    case 'trial_activate':
                        actionText = '<span class="badge badge-warning">试用激活</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}`;
                        break;
                    case 'trial_task':
                        actionText = '<span class="badge badge-warning">试用任务</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}<br>剩余: ${escapeHtml(log.remainingTasks)} 次`;
                        break;
                    case 'batch_generate':
                        actionText = '<span class="badge badge-success">批量生成</span>';
                        details = `数量: ${escapeHtml(log.count)} 个<br>期限: ${escapeHtml(log.days)} 天`;
                        break;
                    case 'delete':
                        actionText = '<span class="badge badge-danger">删除密钥</span>';
                        details = `密钥: ${escapeHtml(log.license)}`;
                        break;
                    case 'reset_trial_tasks':
                        actionText = '<span class="badge badge-primary">重置试用</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}<br>次数: ${escapeHtml(log.oldTasks)} → ${escapeHtml(log.newTasks)}`;
                        break;
                    case 'delete_trial_device':
                        actionText = '<span class="badge badge-danger">删除设备</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}<br>剩余: ${escapeHtml(log.remainingTasks)} 次`;
                        break;
                    case 'set_expired':
                        actionText = '<span class="badge badge-danger">设置过期</span>';
                        details = `密钥: ${escapeHtml(log.license)}`;
                        break;
                    default:
                        break;
                }
                
                html += `<tr>
                    <td style="white-space: nowrap;">${escapeHtml(log.timestamp)}</td>
                    <td>${actionText}</td>
                    <td style="font-size: 11px;">${details}</td>
                    <td>${escapeHtml(log.ip || '-')}</td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            
            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLogsPage(${currentLogsPage - 1})" ${currentLogsPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLogsPage} / ${totalPages} 页 (共 ${allLogs.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLogsPage(${currentLogsPage + 1})" ${currentLogsPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }
            
            if (allLogs.length === 0) {
                html = '<p style="text-align: center; color: #999; padding: 40px;">暂无操作日志</p>';
            }
            
            tableEl.innerHTML = html;
        }

        async function loadGlobalConfig() {
            const result = await apiRequest('getGlobalConfig');
            
            if (result.success) {
                const config = result.data;
                document.getElementById('globalPurchaseUrl').value = config.purchaseUrl || 'https://kkw.8u9.top/zsxqhelper';
                document.getElementById('globalPopupMessage').value = config.globalPopupMessage || '';
                document.getElementById('defaultTrialTasks').value = config.defaultTrialTasks || 10;
            } else {
                alert('❌ 加载配置失败：' + result.error);
            }
        }

        // 保存全局配置
        async function saveGlobalConfig() {
            const purchaseUrl = document.getElementById('globalPurchaseUrl').value.trim();
            const globalPopupMessage = document.getElementById('globalPopupMessage').value.trim();
            const defaultTrialTasks = parseInt(document.getElementById('defaultTrialTasks').value) || 10;
            
            if (!purchaseUrl) {
                alert('❌ 请输入购买链接');
                return;
            }
            
            if (defaultTrialTasks < 1 || defaultTrialTasks > 1000) {
                alert('❌ 试用次数必须在 1-1000 之间');
                return;
            }
            
            // 验证URL格式
            try {
                new URL(purchaseUrl);
            } catch (e) {
                alert('❌ 请输入有效的URL格式（如：https://example.com）');
                return;
            }
            
            const result = await apiRequest('updateGlobalConfig', { 
                purchaseUrl,
                globalPopupMessage,
                defaultTrialTasks
            });
            
            if (result.success) {
                alert('✅ 全局配置已保存！\n\n' + 
                      '• 所有"购买"、"升级"按钮将使用此链接\n' +
                      (globalPopupMessage ? '• 所有用户打开插件时将看到弹窗信息\n' : '• 已清空全局弹窗信息\n') +
                      `• 新用户试用次数：${defaultTrialTasks} 次`);
            } else {
                alert('❌ 保存失败：' + result.error);
            }
        }

        // ==================== 测试工具函数 ====================

        // 加载功能配置
        async function loadFeatureConfig() {
            const result = await apiRequest('getFeatureConfig');
            
            if (result.success) {
                const config = result.data;
                document.getElementById('feature-export').checked = config.export !== false;
                document.getElementById('feature-download').checked = config.download !== false;
                document.getElementById('feature-turboDownload').checked = config.turboDownload !== false;
                document.getElementById('feature-search').checked = config.search !== false;
                document.getElementById('feature-searchResult').checked = config.searchResult !== false;
                document.getElementById('feature-column').checked = config.column !== false;
                document.getElementById('feature-digest').checked = config.digest !== false;
                document.getElementById('feature-backup').checked = config.backup !== false;
            }
        }

        // 保存功能配置
        async function saveFeatureConfig() {
            const config = {
                export: document.getElementById('feature-export').checked,
                download: document.getElementById('feature-download').checked,
                turboDownload: document.getElementById('feature-turboDownload').checked,
                search: document.getElementById('feature-search').checked,
                searchResult: document.getElementById('feature-searchResult').checked,
                column: document.getElementById('feature-column').checked,
                digest: document.getElementById('feature-digest').checked,
                backup: document.getElementById('feature-backup').checked
            };

            const resultDiv = document.getElementById('featureConfigResult');
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 保存中...</div>';

            const result = await apiRequest('updateFeatureConfig', { config });

            if (result.success) {
                resultDiv.innerHTML = '<div class="alert alert-success">✅ 功能配置已保存！插件重新加载后生效</div>';
                setTimeout(() => {
                    resultDiv.innerHTML = '';
                }, 3000);
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error">❌ 保存失败：${result.error}</div>`;
            }
        }

        // 全部启用
        function enableAllFeatures() {
            document.getElementById('feature-export').checked = true;
            document.getElementById('feature-download').checked = true;
            document.getElementById('feature-turboDownload').checked = true;
            document.getElementById('feature-search').checked = true;
            document.getElementById('feature-searchResult').checked = true;
            document.getElementById('feature-column').checked = true;
            document.getElementById('feature-digest').checked = true;
            document.getElementById('feature-backup').checked = true;
        }

        // 全部禁用
        function disableAllFeatures() {
            if (!confirm('⚠️ 确定要禁用所有功能吗？\n\n这将使插件无法使用任何功能！')) {
                return;
            }
            document.getElementById('feature-export').checked = false;
            document.getElementById('feature-download').checked = false;
            document.getElementById('feature-turboDownload').checked = false;
            document.getElementById('feature-search').checked = false;
            document.getElementById('feature-searchResult').checked = false;
            document.getElementById('feature-column').checked = false;
            document.getElementById('feature-digest').checked = false;
            document.getElementById('feature-backup').checked = false;
        }

        // ==================== 测试工具函数 ====================

        // 测试激活
        async function testActivate() {
            const license = document.getElementById('testLicense').value.trim();
            const deviceId = document.getElementById('testDeviceId').value.trim() || 
                            'test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
            const resultDiv = document.getElementById('testActivateResult');
            
            if (!license) {
                resultDiv.innerHTML = '<div class="alert alert-error">❌ 请输入密钥</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 测试中...</div>';
            
            const result = await apiRequest('activate', { license, deviceId });
            
            if (result.success) {
                const data = result.data;
                let html = '<div class="alert alert-success">';
                html += '<h4>✅ 激活成功</h4>';
                html += '<table class="info-table">';
                html += `<tr><td>状态</td><td><strong>${data.status === 'trial' ? '试用' : '正式授权'}</strong></td></tr>`;
                html += `<tr><td>设备ID</td><td><code>${escapeHtml(deviceId)}</code></td></tr>`;
                
                if (data.status === 'trial') {
                    html += `<tr><td>剩余次数</td><td><strong>${escapeHtml(data.remainingTasks)}</strong> 次</td></tr>`;
                } else {
                    html += `<tr><td>是否永久</td><td>${data.isPermanent ? '<span style="color: #10b981;">✅ 永久授权</span>' : '❌ 时间授权'}</td></tr>`;
                    if (!data.isPermanent && data.expireDate) {
                        html += `<tr><td>到期日期</td><td><strong>${escapeHtml(data.expireDate)}</strong></td></tr>`;
                    }
                    html += `<tr><td>无限制</td><td>${data.unlimited ? '✅ 是' : '❌ 否'}</td></tr>`;
                }
                
                html += '</table></div>';
                resultDiv.innerHTML = html;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 激活失败</h4><p>${escapeHtml(result.message || result.error || '未知错误')}</p></div>`;
            }
        }

        // 测试任务权限
        async function testTaskPermission() {
            const deviceId = document.getElementById('testTaskDeviceId').value.trim();
            const resultDiv = document.getElementById('testTaskResult');
            
            if (!deviceId) {
                resultDiv.innerHTML = '<div class="alert alert-error">❌ 请输入设备ID</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 测试中...</div>';
            
            const result = await apiRequest('checkTask', { deviceId });
            
            if (result.success) {
                const data = result.data;
                let html = '<div class="alert alert-success">';
                html += '<h4>✅ 有权限执行任务</h4>';
                html += '<table class="info-table">';
                html += `<tr><td>状态</td><td><strong>${data.status === 'trial' ? '试用' : '正式授权'}</strong></td></tr>`;
                
                if (data.status === 'trial') {
                    html += `<tr><td>剩余次数</td><td><strong>${escapeHtml(data.remainingTasks)}</strong> 次</td></tr>`;
                    html += `<tr><td>提示</td><td style="color: #f59e0b;">⚠️ 本次测试已扣除1次试用次数</td></tr>`;
                } else {
                    html += `<tr><td>是否永久</td><td>${data.isPermanent ? '<span style="color: #10b981;">✅ 永久授权</span>' : '❌ 时间授权'}</td></tr>`;
                    html += `<tr><td>无限制</td><td>${data.unlimited ? '✅ 是' : '❌ 否'}</td></tr>`;
                }
                
                html += '</table></div>';
                resultDiv.innerHTML = html;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 无权限</h4><p>${escapeHtml(result.message || result.error || '未知错误')}</p></div>`;
            }
        }

        // 测试试用
        async function testTrial() {
            const deviceId = document.getElementById('testTrialDeviceId').value.trim() || 
                            'trial-test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
            const resultDiv = document.getElementById('testTrialResult');
            
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 测试中...</div>';
            
            const trialKey = 'TRIAL-' + Date.now();
            
            const result = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'activate', 
                    license: trialKey, 
                    deviceId: deviceId 
                })
            }).then(res => res.json());
            
            if (result.success) {
                const data = result.data;
                let html = '<div class="alert alert-success">';
                html += '<h4>✅ 试用激活成功</h4>';
                html += '<table class="info-table">';
                html += `<tr><td>试用密钥</td><td><code>${escapeHtml(trialKey)}</code></td></tr>`;
                html += `<tr><td>设备ID</td><td><code>${escapeHtml(deviceId)}</code></td></tr>`;
                html += `<tr><td>剩余次数</td><td><strong>${escapeHtml(data.remainingTasks)}</strong> 次</td></tr>`;
                html += `<tr><td>状态</td><td><strong>试用模式</strong></td></tr>`;
                html += '</table>';
                html += '<p style="margin-top: 10px; color: #666;">💡 提示：试用结果以服务端识别到的真实来源为准，不再支持伪造 IP 测试</p>';
                html += '</div>';
                resultDiv.innerHTML = html;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 试用失败</h4><p>${escapeHtml(result.message || result.error || '未知错误')}</p></div>`;
            }
        }

        // 查询密钥信息
        async function queryLicenseInfo() {
            const license = document.getElementById('queryLicense').value.trim();
            const resultDiv = document.getElementById('queryLicenseResult');
            
            if (!license) {
                resultDiv.innerHTML = '<div class="alert alert-error">❌ 请输入密钥</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 查询中...</div>';
            
            // 通过列表接口查询
            const result = await apiRequest('listAllLicenses');
            
            if (result.success) {
                const found = result.data.licenses.find(l => l.license === license);
                
                if (found) {
                    let html = '<div class="alert alert-success">';
                    html += '<h4>✅ 找到密钥</h4>';
                    html += '<table class="info-table">';
                    html += `<tr><td>密钥</td><td><code>${escapeHtml(found.license)}</code></td></tr>`;
                    html += `<tr><td>期限</td><td><strong>${found.isPermanent ? '永久' : `${escapeHtml(found.days)}天`}</strong></td></tr>`;
                    html += `<tr><td>状态</td><td><span class="badge ${found.status === 'activated' ? 'badge-success' : 'badge-warning'}">${found.status === 'unused' ? '未使用' : '已激活'}</span></td></tr>`;
                    html += `<tr><td>绑定设备</td><td>${found.deviceId === '未绑定' ? '<span style="color: #999;">未绑定</span>' : '<code>' + escapeHtml(found.deviceId) + '</code>'}</td></tr>`;
                    html += `<tr><td>创建时间</td><td>${escapeHtml(found.created)}</td></tr>`;
                    
                    if (found.activatedAt) {
                        html += `<tr><td>激活时间</td><td>${escapeHtml(found.activatedAt)}</td></tr>`;
                    }
                    
                    html += `<tr><td>到期时间</td><td><strong>${escapeHtml(found.expire)}</strong></td></tr>`;
                    
                    if (found.isExpired) {
                        html += `<tr><td>是否过期</td><td><span style="color: #ef4444;">⚠️ 已过期</span></td></tr>`;
                    }
                    
                    if (found.lastSeen && found.lastSeen !== '未知') {
                        html += `<tr><td>最后使用</td><td>${escapeHtml(found.lastSeen)}</td></tr>`;
                    }
                    
                    if (found.lastIP && found.lastIP !== '-') {
                        html += `<tr><td>最后IP</td><td><code>${escapeHtml(found.lastIP)}</code></td></tr>`;
                    }
                    
                    html += '</table></div>';
                    resultDiv.innerHTML = html;
                } else {
                    resultDiv.innerHTML = '<div class="alert alert-error"><h4>❌ 未找到密钥</h4><p>该密钥不存在或已被删除</p></div>';
                }
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 查询失败</h4><p>${escapeHtml(result.error || '未知错误')}</p></div>`;
            }
        }

        // 设置密钥为过期状态
        async function setLicenseExpired() {
            const license = document.getElementById('expireTestLicense').value.trim();
            const resultDiv = document.getElementById('expireTestResult');
            
            if (!license) {
                resultDiv.innerHTML = '<div class="alert alert-error">❌ 请输入密钥</div>';
                return;
            }
            
            if (!confirm('⚠️ 确定要将此密钥设置为过期状态吗？\n\n这将修改密钥的到期时间为过去的时间。')) {
                return;
            }
            
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 设置中...</div>';
            
            const result = await apiRequest('setLicenseExpired', { license });
            
            if (result.success) {
                resultDiv.innerHTML = `<div class="alert alert-success"><h4>✅ 设置成功</h4><p>密钥已设置为过期状态，到期时间：${escapeHtml(result.data.expireTime)}</p></div>`;
            } else {
                resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 设置失败</h4><p>${escapeHtml(result.error || '未知错误')}</p></div>`;
            }
        }

        // 测试过期后试用
        async function testExpiredThenTrial() {
            const license = document.getElementById('expireTestLicense').value.trim();
            const resultDiv = document.getElementById('expireTestResult');
            
            if (!license) {
                resultDiv.innerHTML = '<div class="alert alert-error">❌ 请输入密钥</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="alert alert-info">⏳ 测试中...</div>';
            
            // 步骤1：查询密钥信息
            const listResult = await apiRequest('listAllLicenses');
            if (!listResult.success) {
                resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 查询失败</h4><p>${escapeHtml(listResult.error)}</p></div>`;
                return;
            }
            
            const found = listResult.data.licenses.find(l => l.license === license);
            if (!found) {
                resultDiv.innerHTML = '<div class="alert alert-error"><h4>❌ 密钥不存在</h4></div>';
                return;
            }
            
            const deviceId = found.deviceId === '未绑定' ? null : found.deviceId;
            
            let html = '<div class="alert alert-info">';
            html += '<h4>📋 测试流程</h4>';
            html += '<table class="info-table">';
            html += `<tr><td>密钥</td><td><code>${escapeHtml(license)}</code></td></tr>`;
            html += `<tr><td>当前状态</td><td>${found.isExpired ? '<span style="color: #ef4444;">⚠️ 已过期</span>' : '<span style="color: #10b981;">✅ 有效</span>'}</td></tr>`;
            html += `<tr><td>绑定设备</td><td>${deviceId ? '<code>' + escapeHtml(deviceId) + '</code>' : '<span style="color: #999;">未绑定</span>'}</td></tr>`;
            html += '</table>';
            
            // 步骤2：如果密钥未过期，先设置为过期
            if (!found.isExpired) {
                html += '<p style="margin-top: 15px;">⏳ 步骤1：设置密钥为过期...</p>';
                resultDiv.innerHTML = html + '</div>';
                
                const expireResult = await apiRequest('setLicenseExpired', { license });
                if (!expireResult.success) {
                    resultDiv.innerHTML = `<div class="alert alert-error"><h4>❌ 设置过期失败</h4><p>${escapeHtml(expireResult.error)}</p></div>`;
                    return;
                }
                
                html += '<p style="color: #10b981;">✅ 步骤1完成：密钥已设置为过期</p>';
            } else {
                html += '<p style="margin-top: 15px; color: #10b981;">✅ 密钥已经是过期状态</p>';
            }
            
            // 步骤3：尝试使用过期密钥激活（应该失败）
            html += '<p style="margin-top: 10px;">⏳ 步骤2：尝试使用过期密钥激活...</p>';
            resultDiv.innerHTML = html + '</div>';
            
            const testDeviceId = deviceId || 'test-expired-' + Date.now();
            const activateResult = await apiRequest('activate', { license, deviceId: testDeviceId });
            
            if (activateResult.success) {
                html += '<p style="color: #ef4444;">❌ 步骤2失败：过期密钥不应该能激活！</p>';
                resultDiv.innerHTML = html + '</div>';
                return;
            } else {
                html += `<p style="color: #10b981;">✅ 步骤2通过：过期密钥无法激活（${escapeHtml(activateResult.error)}）</p>`;
            }
            
            // 步骤4：尝试试用（应该成功，如果IP未试用过）
            html += '<p style="margin-top: 10px;">⏳ 步骤3：尝试使用试用密钥激活...</p>';
            resultDiv.innerHTML = html + '</div>';
            
            const trialKey = 'TRIAL-' + Date.now();
            const trialDeviceId = 'trial-after-expire-' + Date.now();

            const trialResult = await apiRawRequest('activate', {
                license: trialKey,
                deviceId: trialDeviceId
            });
            
            if (trialResult.success) {
                html += '<p style="color: #10b981;">✅ 步骤3通过：可以使用试用功能！</p>';
                html += '<table class="info-table" style="margin-top: 10px;">';
                html += `<tr><td>试用密钥</td><td><code>${escapeHtml(trialKey)}</code></td></tr>`;
                html += `<tr><td>试用设备</td><td><code>${escapeHtml(trialDeviceId)}</code></td></tr>`;
                html += `<tr><td>剩余次数</td><td><strong>${escapeHtml(trialResult.data.remainingTasks)}</strong> 次</td></tr>`;
                html += '</table>';
                html += '<div style="margin-top: 15px; padding: 12px; background: #d4edda; border-radius: 6px; border-left: 4px solid #28a745;">';
                html += '<strong style="color: #155724;">🎉 测试结论：密钥过期后，用户仍可按服务端识别到的真实来源继续试用。</strong>';
                html += '</div>';
            } else {
                html += `<p style="color: #ef4444;">❌ 步骤3失败：无法使用试用功能（${escapeHtml(trialResult.message || trialResult.error)})</p>`;
                html += '<div style="margin-top: 15px; padding: 12px; background: #f8d7da; border-radius: 6px; border-left: 4px solid #dc3545;">';
                html += '<strong style="color: #721c24;">⚠️ 测试结论：密钥过期后，当前真实来源无法继续试用，可能该来源已试用过。</strong>';
                html += '</div>';
            }
            
            resultDiv.innerHTML = html + '</div>';
        }

        // ==================== 功能限制配置函数 ====================

        // 加载使用统计
        async function loadUsageStats() {
            const license = document.getElementById('statsLicenseFilter').value;
            const period = document.getElementById('statsPeriodFilter').value;
            const contentDiv = document.getElementById('statsContent');
            
            contentDiv.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">⏳ 加载中...</p>';
            
            const result = await apiRequest('getFeatureUsageStats', { license, period });
            
            if (!result.success) {
                contentDiv.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 40px;">❌ 加载失败：${result.error}</p>`;
                return;
            }
            
            const data = result.data;
            
            // 如果没有选择密钥，显示所有密钥的汇总
            if (!license) {
                renderAllLicensesStats(data, period);
            } else {
                renderSingleLicenseStats(data, license, period);
            }
        }
        
        // 渲染所有密钥的统计
        function renderAllLicensesStats(data, period) {
            const contentDiv = document.getElementById('statsContent');
            
            if (Object.keys(data).length === 0) {
                contentDiv.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暂无使用统计数据</p>';
                return;
            }
            
            let html = '<table><thead><tr><th>密钥</th>';
            
            const features = ['export', 'download', 'turboDownload', 'search', 'searchResult', 'column', 'digest', 'backup'];
            const featureNames = {
                export: '📤 帖子导出',
                download: '📥 文件下载',
                turboDownload: '🚀 极速下载',
                search: '🔍 关键词搜索',
                searchResult: '📋 导出搜索框',
                column: '📚 专栏导出',
                digest: '⭐ 精华导出',
                backup: '📦 全量备份'
            };
            
            features.forEach(f => {
                html += `<th>${featureNames[f]}</th>`;
            });
            
            html += '<th>总计</th></tr></thead><tbody>';
            
            // 遍历所有密钥
            for (const [lic, stats] of Object.entries(data)) {
                html += `<tr><td style="font-family: monospace; font-size: 11px;">${lic.substring(0, 20)}...</td>`;
                
                let total = 0;
                let periodData = {};
                
                if (period === 'total') {
                    periodData = stats.total || {};
                } else if (period === 'monthly') {
                    // 汇总所有月份
                    periodData = {};
                    for (const [month, monthData] of Object.entries(stats.monthly || {})) {
                        for (const [feature, count] of Object.entries(monthData)) {
                            periodData[feature] = (periodData[feature] || 0) + count;
                        }
                    }
                } else if (period === 'daily') {
                    // 汇总所有天
                    periodData = {};
                    for (const [day, dayData] of Object.entries(stats.daily || {})) {
                        for (const [feature, count] of Object.entries(dayData)) {
                            periodData[feature] = (periodData[feature] || 0) + count;
                        }
                    }
                }
                
                features.forEach(f => {
                    const count = periodData[f] || 0;
                    total += count;
                    html += `<td>${count}</td>`;
                });
                
                html += `<td><strong>${total}</strong></td></tr>`;
            }
            
            html += '</tbody></table>';
            contentDiv.innerHTML = html;
        }
        
        // 渲染单个密钥的统计
        function renderSingleLicenseStats(data, license, period) {
            const contentDiv = document.getElementById('statsContent');
            
            const featureNames = {
                export: '📤 帖子导出',
                download: '📥 文件下载',
                turboDownload: '🚀 极速下载',
                search: '🔍 关键词搜索',
                searchResult: '📋 导出搜索框',
                column: '📚 专栏导出',
                digest: '⭐ 精华导出',
                backup: '📦 全量备份'
            };
            
            let html = '<table><thead><tr><th>时间</th>';
            
            const features = Object.keys(featureNames);
            features.forEach(f => {
                html += `<th>${featureNames[f]}</th>`;
            });
            
            html += '<th>总计</th></tr></thead><tbody>';
            
            if (period === 'total') {
                // 显示总计
                html += '<tr><td><strong>总计</strong></td>';
                let total = 0;
                features.forEach(f => {
                    const count = data[f] || 0;
                    total += count;
                    html += `<td>${count}</td>`;
                });
                html += `<td><strong>${total}</strong></td></tr>`;
            } else {
                // 按时间排序显示
                const timeData = Object.entries(data).sort((a, b) => b[0].localeCompare(a[0]));
                
                if (timeData.length === 0) {
                    html += '<tr><td colspan="10" style="text-align: center; color: #999;">暂无数据</td></tr>';
                } else {
                    timeData.forEach(([time, counts]) => {
                        html += `<tr><td>${time}</td>`;
                        let total = 0;
                        features.forEach(f => {
                            const count = counts[f] || 0;
                            total += count;
                            html += `<td>${count}</td>`;
                        });
                        html += `<td><strong>${total}</strong></td></tr>`;
                    });
                }
            }
            
            html += '</tbody></table>';
            contentDiv.innerHTML = html;
        }
        
        // 初始化统计页面（加载密钥列表）
        async function initStatsPage() {
            const result = await apiRequest('listAllLicenses');
            
            if (result.success) {
                const select = document.getElementById('statsLicenseFilter');
                select.innerHTML = '<option value="">全部密钥</option>';
                
                result.data.licenses.forEach(lic => {
                    const option = document.createElement('option');
                    option.value = lic.license;
                    option.textContent = `${lic.license} (${lic.status === 'activated' ? '已激活' : '未使用'})`;
                    select.appendChild(option);
                });
            }
        }

        // 显示全局功能限制配置弹窗
        async function showFeatureLimitsConfig() {
            const result = await apiRequest('getFeatureLimitsConfig');
            
            if (!result.success) {
                alert('❌ 加载配置失败：' + result.error);
                return;
            }
            
            const config = result.data.global;
            
            // 创建弹窗HTML
            const modalHtml = `
                <div id="limitsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <h2 style="margin-bottom: 20px;">⚙️ 全局功能限制配置</h2>
                        <p style="color: #666; margin-bottom: 20px;">设置所有密钥的默认功能使用限制（0 表示无限制）</p>
                        
                        <div style="display: grid; gap: 20px;">
                            ${createFeatureLimitRow('export', '📤 帖子导出', config.export)}
                            ${createFeatureLimitRow('download', '📥 文件下载', config.download)}
                            ${createFeatureLimitRow('turboDownload', '🚀 极速下载', config.turboDownload)}
                            ${createFeatureLimitRow('search', '🔍 关键词搜索', config.search)}
                            ${createFeatureLimitRow('searchResult', '📋 导出搜索框', config.searchResult)}
                            ${createFeatureLimitRow('column', '📚 专栏导出', config.column)}
                            ${createFeatureLimitRow('digest', '⭐ 精华导出', config.digest)}
                            ${createFeatureLimitRow('backup', '📦 全量备份', config.backup)}
                        </div>
                        
                        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button class="btn btn-secondary" onclick="closeLimitsModal()">取消</button>
                            <button class="btn btn-primary" onclick="saveGlobalLimits()">💾 保存配置</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // 创建功能限制配置行
        function createFeatureLimitRow(feature, label, config) {
            const enabled = config?.enabled !== false;
            const limit = config?.limit ?? 0;
            const period = config?.period || 'unlimited';
            
            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <strong style="font-size: 15px;">${label}</strong>
                        <label class="switch">
                            <input type="checkbox" id="limit-${feature}-enabled" ${enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">次数限制</label>
                            <input type="number" id="limit-${feature}-count" class="form-control" value="${limit}" placeholder="0 表示无限制" style="padding: 8px;" min="0">
                        </div>
                        <div>
                            <label style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">周期</label>
                            <select id="limit-${feature}-period" class="form-control" style="padding: 8px;">
                                <option value="unlimited" ${period === 'unlimited' ? 'selected' : ''}>无限制</option>
                                <option value="daily" ${period === 'daily' ? 'selected' : ''}>每天</option>
                                <option value="weekly" ${period === 'weekly' ? 'selected' : ''}>每周</option>
                                <option value="monthly" ${period === 'monthly' ? 'selected' : ''}>每月</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 关闭限制配置弹窗
        function closeLimitsModal() {
            const modal = document.getElementById('limitsModal');
            if (modal) modal.remove();
        }
        
        // 保存全局限制配置
        async function saveGlobalLimits() {
            const features = ['export', 'download', 'turboDownload', 'search', 'searchResult', 'column', 'digest', 'backup'];
            const config = { global: {}, licenses: {} };
            
            features.forEach(feature => {
                const enabled = document.getElementById(`limit-${feature}-enabled`).checked;
                const limit = parseInt(document.getElementById(`limit-${feature}-count`).value) || 0;
                const period = document.getElementById(`limit-${feature}-period`).value;
                
                config.global[feature] = { enabled, limit, period };
            });
            
            const result = await apiRequest('updateFeatureLimitsConfig', { config });
            
            if (result.success) {
                alert('✅ 全局功能限制配置已保存！');
                closeLimitsModal();
            } else {
                alert('❌ 保存失败：' + result.error);
            }
        }
        
        // 显示单个密钥限制配置弹窗
        async function showLicenseLimitsConfig() {
            const license = prompt('请输入要配置的密钥：');
            if (!license) return;
            
            // 先获取全局配置和该密钥的配置
            const result = await apiRequest('getFeatureLimitsConfig');
            
            if (!result.success) {
                alert('❌ 加载配置失败：' + result.error);
                return;
            }
            
            const globalConfig = result.data.global;
            const licenseConfig = result.data.licenses[license] || {};
            
            // 创建弹窗HTML
            const modalHtml = `
                <div id="licenseLimitsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <h2 style="margin-bottom: 10px;">🔑 单个密钥限制配置</h2>
                        <p style="color: #666; margin-bottom: 5px;">密钥：<code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${license}</code></p>
                        <p style="color: #666; margin-bottom: 20px; font-size: 13px;">💡 留空或设置为 0 将使用全局配置</p>
                        
                        <div style="display: grid; gap: 20px;">
                            ${createLicenseFeatureLimitRow('export', '📤 帖子导出', globalConfig.export, licenseConfig.export)}
                            ${createLicenseFeatureLimitRow('download', '📥 文件下载', globalConfig.download, licenseConfig.download)}
                            ${createLicenseFeatureLimitRow('turboDownload', '🚀 极速下载', globalConfig.turboDownload, licenseConfig.turboDownload)}
                            ${createLicenseFeatureLimitRow('search', '🔍 关键词搜索', globalConfig.search, licenseConfig.search)}
                            ${createLicenseFeatureLimitRow('searchResult', '📋 导出搜索框', globalConfig.searchResult, licenseConfig.searchResult)}
                            ${createLicenseFeatureLimitRow('column', '📚 专栏导出', globalConfig.column, licenseConfig.column)}
                            ${createLicenseFeatureLimitRow('digest', '⭐ 精华导出', globalConfig.digest, licenseConfig.digest)}
                            ${createLicenseFeatureLimitRow('backup', '📦 全量备份', globalConfig.backup, licenseConfig.backup)}
                        </div>
                        
                        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button class="btn btn-secondary" onclick="closeLicenseLimitsModal()">取消</button>
                            <button class="btn btn-primary" onclick="saveLicenseLimits('${license}')">💾 保存配置</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // 创建单个密钥功能限制配置行
        function createLicenseFeatureLimitRow(feature, label, globalConfig, licenseConfig) {
            const hasOverride = licenseConfig && licenseConfig.enabled !== undefined;
            const enabled = hasOverride ? licenseConfig.enabled : (globalConfig?.enabled !== false);
            const limit = hasOverride ? (licenseConfig.limit ?? 0) : 0;
            const period = hasOverride ? (licenseConfig.period || 'unlimited') : 'unlimited';
            
            const globalText = `全局：${globalConfig?.enabled !== false ? '启用' : '禁用'}, ${globalConfig?.limit ?? 0} 次/${globalConfig?.period || 'unlimited'}`;
            
            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 15px;">${label}</strong>
                        <label class="switch">
                            <input type="checkbox" id="lic-limit-${feature}-enabled" ${enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div style="font-size: 12px; color: #999; margin-bottom: 10px;">${globalText}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">次数限制</label>
                            <input type="number" id="lic-limit-${feature}-count" class="form-control" value="${limit}" placeholder="0 使用全局" style="padding: 8px;" min="0">
                        </div>
                        <div>
                            <label style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">周期</label>
                            <select id="lic-limit-${feature}-period" class="form-control" style="padding: 8px;">
                                <option value="unlimited" ${period === 'unlimited' ? 'selected' : ''}>无限制</option>
                                <option value="daily" ${period === 'daily' ? 'selected' : ''}>每天</option>
                                <option value="weekly" ${period === 'weekly' ? 'selected' : ''}>每周</option>
                                <option value="monthly" ${period === 'monthly' ? 'selected' : ''}>每月</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 关闭单个密钥限制配置弹窗
        function closeLicenseLimitsModal() {
            const modal = document.getElementById('licenseLimitsModal');
            if (modal) modal.remove();
        }
        
        // 保存单个密钥限制配置
        async function saveLicenseLimits(license) {
            const features = ['export', 'download', 'turboDownload', 'search', 'searchResult', 'column', 'digest', 'backup'];
            
            // 先获取当前完整配置
            const currentResult = await apiRequest('getFeatureLimitsConfig');
            if (!currentResult.success) {
                alert('❌ 加载配置失败：' + currentResult.error);
                return;
            }
            
            const config = currentResult.data;
            config.licenses[license] = {};
            
            features.forEach(feature => {
                const enabled = document.getElementById(`lic-limit-${feature}-enabled`).checked;
                const limit = parseInt(document.getElementById(`lic-limit-${feature}-count`).value) || 0;
                const period = document.getElementById(`lic-limit-${feature}-period`).value;
                
                // 只保存有效的覆盖配置（不是 0 或 unlimited）
                if (limit !== 0 || period !== 'unlimited' || !enabled) {
                    config.licenses[license][feature] = { enabled, limit, period };
                }
            });
            
            // 如果没有任何覆盖配置，删除该密钥的配置
            if (Object.keys(config.licenses[license]).length === 0) {
                delete config.licenses[license];
            }
            
            const result = await apiRequest('updateFeatureLimitsConfig', { config });
            
            if (result.success) {
                alert('✅ 密钥限制配置已保存！');
                closeLicenseLimitsModal();
            } else {
                alert('❌ 保存失败：' + result.error);
            }
        }

        let filteredLicensesCache = [];
        let filteredTrialDevices = [];
        let allLogsRaw = [];

        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            const targetTab = getTabButton(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById('page-' + tabName).classList.add('active');

            localStorage.setItem('adminCurrentTab', tabName);

            if (tabName === 'dashboard') loadDashboard();
            else if (tabName === 'licenses') loadLicenses();
            else if (tabName === 'config') loadGlobalConfig();
            else if (tabName === 'trial') loadTrialDevices();
            else if (tabName === 'logs') loadLogs();
            else if (tabName === 'features') loadFeatureConfig();
            else if (tabName === 'stats') {
                initStatsPage();
                loadUsageStats();
            }
        }

        async function loadLicenses() {
            const result = await apiRequest('listAllLicenses');
            const tableEl = document.getElementById('licensesTable');

            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                updatePageMeta('licensesMeta', '加载密钥数据失败');
                return;
            }

            allLicensesCache = result.data.licenses || [];
            filterLicenses();
        }

        function filterLicenses() {
            const statusFilter = document.getElementById('filterStatus')?.value || 'all';
            const daysFilter = document.getElementById('filterDays')?.value || 'all';
            const keyword = (document.getElementById('searchLicense')?.value || '').trim().toLowerCase();

            let filtered = [...allLicensesCache];

            if (statusFilter !== 'all') {
                if (statusFilter === 'expired') {
                    filtered = filtered.filter(l => l.isExpired);
                } else {
                    filtered = filtered.filter(l => l.status === statusFilter && !l.isExpired);
                }
            }

            if (daysFilter !== 'all') {
                filtered = filtered.filter(l => l.days === parseInt(daysFilter, 10));
            }

            if (keyword) {
                filtered = filtered.filter((l) => {
                    const haystack = [
                        l.license,
                        l.deviceId,
                        l.created,
                        l.activatedAt,
                        l.expire,
                        l.popupMessage
                    ].join(' ').toLowerCase();
                    return haystack.includes(keyword);
                });
            }

            filteredLicensesCache = filtered;
            currentLicensesPage = 1;
            renderLicenses();
        }

        function renderLicenses(licenses = filteredLicensesCache) {
            const tableEl = document.getElementById('licensesTable');
            updatePageMeta('licensesMeta', `共 ${allLicensesCache.length} 个密钥，当前筛选后 ${licenses.length} 个`);

            if (licenses.length === 0) {
                tableEl.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">没有匹配的密钥记录</p>';
                return;
            }

            const start = (currentLicensesPage - 1) * licensesPageSize;
            const end = start + licensesPageSize;
            const pagedLicenses = licenses.slice(start, end);
            const totalPages = Math.ceil(licenses.length / licensesPageSize);

            let html = '<table><thead><tr><th>密钥</th><th>期限</th><th>状态</th><th>设备ID</th><th>创建时间</th><th>激活时间</th><th>过期时间</th><th>剩余天数</th><th>配置</th><th>操作</th></tr></thead><tbody>';

            pagedLicenses.forEach(lic => {
                const now = Date.now();
                const isPermanent = lic.days === 0;
                const daysLeft = isPermanent ? Infinity : (lic.expireTime ? Math.ceil((lic.expireTime - now) / (1000 * 60 * 60 * 24)) : lic.days);

                let statusBadge = '<span class="badge badge-secondary">未知</span>';
                if (lic.isExpired) {
                    statusBadge = '<span class="badge badge-danger">已过期</span>';
                } else if (lic.status === 'unused') {
                    statusBadge = '<span class="badge badge-success">未使用</span>';
                } else if (lic.status === 'activated') {
                    statusBadge = '<span class="badge badge-warning">已激活</span>';
                }

                let daysLeftBadge = '';
                if (isPermanent) {
                    daysLeftBadge = '<span class="badge badge-success">永久</span>';
                } else if (lic.status === 'unused') {
                    daysLeftBadge = `<span class="badge badge-success">激活后${escapeHtml(lic.days)}天</span>`;
                } else if (!lic.isExpired) {
                    if (daysLeft <= 7) {
                        daysLeftBadge = `<span class="badge badge-danger">${escapeHtml(daysLeft)}天</span>`;
                    } else if (daysLeft <= 30) {
                        daysLeftBadge = `<span class="badge badge-warning">${escapeHtml(daysLeft)}天</span>`;
                    } else {
                        daysLeftBadge = `<span class="badge badge-success">${escapeHtml(daysLeft)}天</span>`;
                    }
                }

                const periodText = isPermanent ? '永久' : `${escapeHtml(lic.days)}天`;
                const activatedTime = lic.status === 'unused' ? '-' : escapeHtml(lic.activatedAt || '-');
                const expireDisplay = lic.status === 'unused' ? '待激活' : escapeHtml(lic.expire);
                const hasConfig = !!lic.popupMessage;
                const configBadge = hasConfig ? '<span class="badge badge-success">已配置</span>' : '<span class="badge badge-secondary">未配置</span>';

                html += `<tr>
                    <td style="font-family: monospace; font-size: 11px;">${escapeHtml(lic.license)}</td>
                    <td>${periodText}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family: monospace; font-size: 10px;">${escapeHtml(lic.deviceId)}</td>
                    <td>${escapeHtml(lic.created)}</td>
                    <td>${activatedTime}</td>
                    <td>${expireDisplay}</td>
                    <td>${daysLeftBadge}</td>
                    <td>${configBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-license-config-btn" data-license="${encodeDataValue(lic.license)}" data-message="${encodeDataValue(lic.popupMessage || '')}">配置</button>
                        <button class="btn btn-sm btn-secondary edit-license-limits-btn" data-license="${encodeDataValue(lic.license)}">限制</button>
                        <button class="btn btn-sm btn-danger delete-license-btn" data-license="${encodeDataValue(lic.license)}">删除</button>
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';

            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage - 1})" ${currentLicensesPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLicensesPage} / ${totalPages} 页 (共 ${licenses.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage + 1})" ${currentLicensesPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }

            tableEl.innerHTML = html;

            tableEl.querySelectorAll('.edit-license-config-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    editLicenseConfig(
                        decodeDataValue(btn.dataset.license),
                        decodeDataValue(btn.dataset.message)
                    );
                });
            });

            tableEl.querySelectorAll('.edit-license-limits-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    showLicenseLimitsConfig(decodeDataValue(btn.dataset.license));
                });
            });

            tableEl.querySelectorAll('.delete-license-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    deleteLicense(decodeDataValue(btn.dataset.license));
                });
            });
        }

        function changeLicensesPage(page) {
            const totalPages = Math.ceil(filteredLicensesCache.length / licensesPageSize);
            if (page < 1 || page > totalPages) return;
            currentLicensesPage = page;
            renderLicenses();
        }

        function exportAllLicenses(format = 'csv') {
            const hasActiveFilter = Boolean(
                (document.getElementById('searchLicense')?.value || '').trim() ||
                (document.getElementById('filterStatus')?.value || 'all') !== 'all' ||
                (document.getElementById('filterDays')?.value || 'all') !== 'all'
            );
            const exportList = hasActiveFilter ? filteredLicensesCache : allLicensesCache;

            if (exportList.length === 0) {
                showToast('当前筛选条件下没有可导出的密钥', 'error');
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            let content;
            let filename;
            let mimeType;

            if (format === 'txt') {
                content = exportList.map(lic => lic.license).join('\n');
                filename = `all-licenses-${timestamp}.txt`;
                mimeType = 'text/plain';
            } else {
                content = '密钥,期限,状态,设备ID,创建时间,过期时间\n';

                exportList.forEach(lic => {
                    const status = lic.isExpired ? '已过期' : (lic.status === 'unused' ? '未使用' : '已激活');
                    const periodText = (lic.isPermanent || lic.days === 0) ? '永久' : `${lic.days}天`;
                    content += `${lic.license},${periodText},${status},${lic.deviceId},${lic.created},${lic.expire}\n`;
                });

                filename = `all-licenses-${timestamp}.csv`;
                mimeType = 'text/csv';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            showToast(`已导出 ${exportList.length} 个密钥`);
        }

        async function loadTrialDevices() {
            const result = await apiRequest('listTrialDevices');
            const tableEl = document.getElementById('trialTable');

            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                updatePageMeta('trialMeta', '加载试用设备失败');
                return;
            }

            allTrialDevices = result.data.devices || [];
            filterTrialDevices();
        }

        function filterTrialDevices() {
            const keyword = (document.getElementById('searchTrialDevice')?.value || '').trim().toLowerCase();

            filteredTrialDevices = keyword
                ? allTrialDevices.filter((device) => {
                    const haystack = [
                        device.deviceId,
                        device.firstSeen,
                        device.lastSeen,
                        device.lastIP
                    ].join(' ').toLowerCase();
                    return haystack.includes(keyword);
                })
                : [...allTrialDevices];

            currentTrialPage = 1;
            renderTrialDevices();
        }

        function renderTrialDevices(devices = filteredTrialDevices) {
            const tableEl = document.getElementById('trialTable');
            updatePageMeta('trialMeta', `共 ${allTrialDevices.length} 台试用设备，当前筛选后 ${devices.length} 台`);

            if (devices.length === 0) {
                tableEl.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">没有匹配的试用设备</p>';
                return;
            }

            const start = (currentTrialPage - 1) * trialPageSize;
            const end = start + trialPageSize;
            const pagedDevices = devices.slice(start, end);
            const totalPages = Math.ceil(devices.length / trialPageSize);

            let html = '<table><thead><tr><th>设备ID</th><th>剩余次数</th><th>首次使用</th><th>最后使用</th><th>IP地址</th><th>操作</th></tr></thead><tbody>';

            pagedDevices.forEach(device => {
                html += `<tr>
                    <td style="font-family: monospace; font-size: 11px;">${escapeHtml(device.deviceId)}</td>
                    <td><span class="badge ${device.remainingTasks > 5 ? 'badge-success' : device.remainingTasks > 0 ? 'badge-warning' : 'badge-danger'}">${escapeHtml(device.remainingTasks)} 次</span></td>
                    <td>${escapeHtml(device.firstSeen)}</td>
                    <td>${escapeHtml(device.lastSeen)}</td>
                    <td>${escapeHtml(device.lastIP)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm reset-trial-btn" data-device-id="${encodeDataValue(device.deviceId)}" data-tasks="10" style="margin-bottom: 5px;">重置为10次</button>
                        <button class="btn btn-secondary btn-sm reset-trial-btn" data-device-id="${encodeDataValue(device.deviceId)}" data-tasks="20" style="margin-bottom: 5px;">重置为20次</button>
                        <button class="btn btn-danger btn-sm delete-trial-btn" data-device-id="${encodeDataValue(device.deviceId)}">删除设备</button>
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';

            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeTrialPage(${currentTrialPage - 1})" ${currentTrialPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentTrialPage} / ${totalPages} 页 (共 ${devices.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeTrialPage(${currentTrialPage + 1})" ${currentTrialPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }

            tableEl.innerHTML = html;

            tableEl.querySelectorAll('.reset-trial-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    resetTrialTasks(
                        decodeDataValue(btn.dataset.deviceId),
                        Number(btn.dataset.tasks)
                    );
                });
            });

            tableEl.querySelectorAll('.delete-trial-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    deleteTrialDevice(decodeDataValue(btn.dataset.deviceId));
                });
            });
        }

        function changeTrialPage(page) {
            const totalPages = Math.ceil(filteredTrialDevices.length / trialPageSize);
            if (page < 1 || page > totalPages) return;
            currentTrialPage = page;
            renderTrialDevices();
        }

        async function loadLogs() {
            const result = await apiRequest('getLogs', { page: 1, pageSize: 1000 });
            const tableEl = document.getElementById('logsTable');

            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                updatePageMeta('logsMeta', '加载操作日志失败');
                return;
            }

            allLogsRaw = result.data.logs || [];
            filterLogs();
        }

        function filterLogs() {
            const filterAction = document.getElementById('filterLogAction')?.value || 'all';
            const keyword = (document.getElementById('searchLogKeyword')?.value || '').trim().toLowerCase();

            allLogs = allLogsRaw.filter((log) => {
                const actionMatched = filterAction === 'all' ? true : log.action === filterAction;
                if (!actionMatched) return false;

                if (!keyword) return true;

                const haystack = [
                    log.action,
                    log.timestamp,
                    log.license,
                    log.deviceId,
                    log.ip,
                    log.remainingTasks,
                    log.oldTasks,
                    log.newTasks
                ].join(' ').toLowerCase();

                return haystack.includes(keyword);
            });

            currentLogsPage = 1;
            renderLogs();
        }

        function renderLogs(logs = allLogs) {
            const tableEl = document.getElementById('logsTable');
            updatePageMeta('logsMeta', `共 ${allLogsRaw.length} 条日志，当前筛选后 ${logs.length} 条`);

            if (logs.length === 0) {
                tableEl.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">没有匹配的日志记录</p>';
                return;
            }

            const start = (currentLogsPage - 1) * logsPageSize;
            const end = start + logsPageSize;
            const pagedLogs = logs.slice(start, end);
            const totalPages = Math.ceil(logs.length / logsPageSize);

            let html = '<table><thead><tr><th>时间</th><th>操作</th><th>详情</th><th>IP地址</th></tr></thead><tbody>';

            pagedLogs.forEach(log => {
                let actionText = escapeHtml(log.action);
                let details = escapeHtml(JSON.stringify(log));

                switch(log.action) {
                    case 'activate':
                        actionText = '<span class="badge badge-success">密钥激活</span>';
                        details = `密钥: ${escapeHtml(log.license)}<br>设备: ${escapeHtml(log.deviceId)}`;
                        break;
                    case 'trial_activate':
                        actionText = '<span class="badge badge-warning">试用激活</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}`;
                        break;
                    case 'trial_task':
                        actionText = '<span class="badge badge-warning">试用任务</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}<br>剩余: ${escapeHtml(log.remainingTasks)} 次`;
                        break;
                    case 'batch_generate':
                        actionText = '<span class="badge badge-success">批量生成</span>';
                        details = `数量: ${escapeHtml(log.count)} 个<br>期限: ${escapeHtml(log.days)} 天`;
                        break;
                    case 'delete':
                        actionText = '<span class="badge badge-danger">删除密钥</span>';
                        details = `密钥: ${escapeHtml(log.license)}`;
                        break;
                    case 'reset_trial_tasks':
                        actionText = '<span class="badge badge-primary">重置试用</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}<br>次数: ${escapeHtml(log.oldTasks)} → ${escapeHtml(log.newTasks)}`;
                        break;
                    case 'delete_trial_device':
                        actionText = '<span class="badge badge-danger">删除设备</span>';
                        details = `设备: ${escapeHtml(log.deviceId)}<br>剩余: ${escapeHtml(log.remainingTasks)} 次`;
                        break;
                    case 'set_expired':
                        actionText = '<span class="badge badge-danger">设置过期</span>';
                        details = `密钥: ${escapeHtml(log.license)}`;
                        break;
                    default:
                        break;
                }

                html += `<tr>
                    <td style="white-space: nowrap;">${escapeHtml(log.timestamp)}</td>
                    <td>${actionText}</td>
                    <td style="font-size: 11px;">${details}</td>
                    <td>${escapeHtml(log.ip || '-')}</td>
                </tr>`;
            });

            html += '</tbody></table>';

            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLogsPage(${currentLogsPage - 1})" ${currentLogsPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLogsPage} / ${totalPages} 页 (共 ${logs.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLogsPage(${currentLogsPage + 1})" ${currentLogsPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }

            tableEl.innerHTML = html;
        }

        function changeLogsPage(page) {
            const totalPages = Math.ceil(allLogs.length / logsPageSize);
            if (page < 1 || page > totalPages) return;
            currentLogsPage = page;
            renderLogs();
        }

        async function updateLicenseConfig(license, popupMessage) {
            const result = await apiRequest('updateLicenseConfig', {
                license,
                popupMessage
            });

            if (result.success) {
                showToast(`密钥 ${license} 的弹窗配置已更新`);
                loadLicenses();
            } else {
                showToast('更新失败：' + (result.error || '未知错误'), 'error');
            }
        }

        async function deleteLicense(license) {
            if (!confirm('确定要删除此密钥吗？')) return;

            const result = await apiRequest('deleteLicense', { license });

            if (result.success) {
                showToast(`密钥 ${license} 已删除`);
                loadLicenses();
                loadDashboard();
            } else {
                showToast('删除失败：' + (result.error || '未知错误'), 'error');
            }
        }

        async function resetTrialTasks(deviceId, tasks) {
            if (!confirm(`确定要将设备 ${deviceId.substring(0, 16)}... 的试用次数重置为 ${tasks} 次吗？`)) {
                return;
            }

            const result = await apiRequest('resetTrialTasks', { deviceId, tasks });

            if (result.success) {
                showToast(`试用次数已重置为 ${result.data.newTasks} 次`);
                loadTrialDevices();
            } else {
                showToast('重置失败：' + (result.error || '未知错误'), 'error');
            }
        }

        async function deleteTrialDevice(deviceId) {
            if (!confirm(`⚠️ 确定要删除设备吗？\n\n设备ID: ${deviceId.substring(0, 16)}...\n\n删除后该设备可以重新激活试用（10次）`)) {
                return;
            }

            const result = await apiRequest('deleteTrialDevice', { deviceId });

            if (result.success) {
                showToast('试用设备已删除，可重新激活试用');
                loadTrialDevices();
            } else {
                showToast('删除失败：' + (result.error || '未知错误'), 'error');
            }
        }

        async function saveGlobalConfig() {
            const purchaseUrl = document.getElementById('globalPurchaseUrl').value.trim();
            const globalPopupMessage = document.getElementById('globalPopupMessage').value.trim();
            const defaultTrialTasks = parseInt(document.getElementById('defaultTrialTasks').value, 10) || 10;

            if (!purchaseUrl) {
                showToast('请输入购买链接', 'error');
                return;
            }

            if (defaultTrialTasks < 1 || defaultTrialTasks > 1000) {
                showToast('试用次数必须在 1-1000 之间', 'error');
                return;
            }

            try {
                new URL(purchaseUrl);
            } catch (e) {
                showToast('请输入有效的 URL（如 https://example.com）', 'error');
                return;
            }

            const result = await apiRequest('updateGlobalConfig', {
                purchaseUrl,
                globalPopupMessage,
                defaultTrialTasks
            });

            if (result.success) {
                showToast(`全局配置已保存，默认试用次数 ${defaultTrialTasks} 次`);
            } else {
                showToast('保存失败：' + (result.error || '未知错误'), 'error');
            }
        }

        async function saveGlobalLimits() {
            const features = ['export', 'download', 'turboDownload', 'search', 'searchResult', 'column', 'digest', 'backup'];
            const config = { global: {}, licenses: {} };

            features.forEach(feature => {
                const enabled = document.getElementById(`limit-${feature}-enabled`).checked;
                const limit = parseInt(document.getElementById(`limit-${feature}-count`).value, 10) || 0;
                const period = document.getElementById(`limit-${feature}-period`).value;
                config.global[feature] = { enabled, limit, period };
            });

            const result = await apiRequest('updateFeatureLimitsConfig', { config });

            if (result.success) {
                showToast('全局功能限制配置已保存');
                closeLimitsModal();
            } else {
                showToast('保存失败：' + (result.error || '未知错误'), 'error');
            }
        }

        async function showLicenseLimitsConfig(licenseFromList = '') {
            const presetInput = document.getElementById('licenseLimitsTarget');
            const presetLicense = licenseFromList || presetInput?.value.trim() || '';
            const license = presetLicense || prompt('请输入要配置的密钥：');
            if (!license) return;

            if (presetInput) {
                presetInput.value = license;
            }

            const result = await apiRequest('getFeatureLimitsConfig');

            if (!result.success) {
                showToast('加载配置失败：' + (result.error || '未知错误'), 'error');
                return;
            }

            const globalConfig = result.data.global;
            const licenseConfig = result.data.licenses[license] || {};

            const modalHtml = `
                <div id="licenseLimitsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <h2 style="margin-bottom: 10px;">🔑 单个密钥限制配置</h2>
                        <p style="color: #666; margin-bottom: 5px;">密钥：<code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(license)}</code></p>
                        <p style="color: #666; margin-bottom: 20px; font-size: 13px;">💡 留空或设置为 0 将使用全局配置</p>

                        <div style="display: grid; gap: 20px;">
                            ${createLicenseFeatureLimitRow('export', '📤 帖子导出', globalConfig.export, licenseConfig.export)}
                            ${createLicenseFeatureLimitRow('download', '📥 文件下载', globalConfig.download, licenseConfig.download)}
                            ${createLicenseFeatureLimitRow('turboDownload', '🚀 极速下载', globalConfig.turboDownload, licenseConfig.turboDownload)}
                            ${createLicenseFeatureLimitRow('search', '🔍 关键词搜索', globalConfig.search, licenseConfig.search)}
                            ${createLicenseFeatureLimitRow('searchResult', '📋 导出搜索框', globalConfig.searchResult, licenseConfig.searchResult)}
                            ${createLicenseFeatureLimitRow('column', '📚 专栏导出', globalConfig.column, licenseConfig.column)}
                            ${createLicenseFeatureLimitRow('digest', '⭐ 精华导出', globalConfig.digest, licenseConfig.digest)}
                            ${createLicenseFeatureLimitRow('backup', '📦 全量备份', globalConfig.backup, licenseConfig.backup)}
                        </div>

                        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button class="btn btn-secondary" onclick="closeLicenseLimitsModal()">取消</button>
                            <button id="saveLicenseLimitsBtn" class="btn btn-primary" data-license="${encodeDataValue(license)}">💾 保存配置</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('saveLicenseLimitsBtn')?.addEventListener('click', () => {
                saveLicenseLimits(license);
            });
        }

        async function saveLicenseLimits(license) {
            const features = ['export', 'download', 'turboDownload', 'search', 'searchResult', 'column', 'digest', 'backup'];

            const currentResult = await apiRequest('getFeatureLimitsConfig');
            if (!currentResult.success) {
                showToast('加载配置失败：' + (currentResult.error || '未知错误'), 'error');
                return;
            }

            const config = currentResult.data;
            config.licenses[license] = {};

            features.forEach(feature => {
                const enabled = document.getElementById(`lic-limit-${feature}-enabled`).checked;
                const limit = parseInt(document.getElementById(`lic-limit-${feature}-count`).value, 10) || 0;
                const period = document.getElementById(`lic-limit-${feature}-period`).value;

                if (limit !== 0 || period !== 'unlimited' || !enabled) {
                    config.licenses[license][feature] = { enabled, limit, period };
                }
            });

            if (Object.keys(config.licenses[license]).length === 0) {
                delete config.licenses[license];
            }

            const result = await apiRequest('updateFeatureLimitsConfig', { config });

            if (result.success) {
                showToast(`密钥 ${license} 的限制配置已保存`);
                closeLicenseLimitsModal();
            } else {
                showToast('保存失败：' + (result.error || '未知错误'), 'error');
            }
        }

        function handleUnauthorized(message = '登录已失效，请重新登录') {
            clearAdminSession();
            showLoginPage();
            setLoginError(message);
            document.getElementById('loginPassword')?.focus();
            showToast(message, 'error');
        }

        async function handleLogin(event) {
            event.preventDefault();

            const passwordInput = document.getElementById('loginPassword');
            const submitButton = event?.submitter || document.getElementById('loginSubmitBtn');
            const password = passwordInput?.value || '';

            if (!password.trim()) {
                setLoginError('请输入管理密码');
                passwordInput?.focus();
                return false;
            }

            setLoginError('');
            setButtonBusy(submitButton, true, '登录中...');

            try {
                const result = await apiRawRequest('adminLogin', { password });

                if (result.success) {
                    const sessionData = {
                        loggedIn: true,
                        token: result.data.token,
                        expiry: result.data.expiresAt
                    };

                    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
                    if (passwordInput) passwordInput.value = '';
                    setLoginError('');
                    showMainContent();
                    initializeAdminTabs();
                    showToast('登录成功');
                } else {
                    setLoginError(result.message || '密码错误，请重试');
                    if (passwordInput) {
                        passwordInput.value = '';
                        passwordInput.focus();
                    }
                }
            } catch (error) {
                console.error('登录失败:', error);
                setLoginError('登录失败，请检查网络后重试');
            } finally {
                setButtonBusy(submitButton, false);
            }

            return false;
        }

        async function apiRequest(action, data = {}) {
            try {
                const session = getAdminSession();
                if (!session) {
                    handleUnauthorized();
                    return { success: false, error: 'UNAUTHORIZED' };
                }

                const result = await apiRawRequest(action, {
                    adminToken: session.token,
                    ...data
                });

                if (!result.success && result.error === 'UNAUTHORIZED') {
                    handleUnauthorized(result.message || '登录已失效，请重新登录');
                }

                return result;
            } catch (error) {
                console.error('API 请求失败:', error);
                showToast('网络错误：' + error.message, 'error');
                return { success: false, error: error.message };
            }
        }

        async function loadDashboard() {
            const result = await apiRequest('getStats');

            if (!result.success) {
                showToast('加载仪表盘失败：' + (result.error || '未知错误'), 'error');
                return;
            }

            const stats = result.data;
            document.getElementById('totalLicenses').textContent = stats.totalLicenses;
            document.getElementById('activeLicenses').textContent = stats.activeLicenses;
            document.getElementById('boundDevices').textContent = stats.boundDevices;
            document.getElementById('trialDevices').textContent = stats.trialDevices;
        }

        async function batchGenerateLicenses() {
            const button = document.getElementById('batchGenerateBtn');
            const count = parseInt(document.getElementById('licenseCount').value, 10);
            const days = parseInt(document.getElementById('expireDays').value, 10);
            const popupMessage = document.getElementById('popupMessage').value.trim();

            if (!count || count <= 0) {
                showToast('请输入有效的生成数量', 'error');
                return;
            }

            if (count > 1000) {
                showToast('单次最多生成 1000 个密钥', 'error');
                return;
            }

            setButtonBusy(button, true, '生成中...');

            try {
                const result = await apiRequest('batchGenerateLicenses', {
                    count,
                    days,
                    popupMessage
                });

                if (!result.success) {
                    showToast('生成失败：' + (result.error || '未知错误'), 'error');
                    return;
                }

                generatedLicensesCache = result.data.licenses || [];

                document.getElementById('generatedCount').textContent = result.data.count;
                document.getElementById('generatedDays').textContent = result.data.isPermanent ? '永久' : result.data.days + '天';
                document.getElementById('generatedExpire').textContent =
                    result.data.isPermanent ? '永久有效' : '激活后' + result.data.days + '天';
                document.getElementById('licensesList').innerHTML = generatedLicensesCache
                    .map((lic, index) => `${index + 1}. ${escapeHtml(lic)}`)
                    .join('<br>');
                document.getElementById('generatedResult').style.display = 'block';
                document.getElementById('generatedResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                loadDashboard();
                showToast(`已生成 ${generatedLicensesCache.length} 个密钥`);
            } finally {
                setButtonBusy(button, false);
            }
        }

        function exportLicenses(format) {
            if (generatedLicensesCache.length === 0) {
                showToast('当前没有可导出的新密钥', 'error');
                return;
            }

            const days = parseInt(document.getElementById('expireDays').value, 10);
            const isPermanent = days === 0;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            let content;
            let filename;
            let mimeType;

            if (format === 'txt') {
                content = generatedLicensesCache.join('\n');
                filename = isPermanent ? `licenses-permanent-${timestamp}.txt` : `licenses-${days}days-${timestamp}.txt`;
                mimeType = 'text/plain';
            } else {
                const daysText = isPermanent ? '永久' : `${days}天`;
                const expireNote = isPermanent ? '永久有效' : `激活后${days}天`;
                content = '密钥,有效期,说明,状态\n';
                generatedLicensesCache.forEach(lic => {
                    content += `${lic},${daysText},${expireNote},未使用\n`;
                });
                filename = isPermanent ? `licenses-permanent-${timestamp}.csv` : `licenses-${days}days-${timestamp}.csv`;
                mimeType = 'text/csv';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            showToast(`已导出 ${generatedLicensesCache.length} 个新密钥`);
        }

        async function copyAllLicenses() {
            if (generatedLicensesCache.length === 0) {
                showToast('当前没有可复制的新密钥', 'error');
                return;
            }

            try {
                await navigator.clipboard.writeText(generatedLicensesCache.join('\n'));
                showToast(`已复制 ${generatedLicensesCache.length} 个密钥到剪贴板`);
            } catch (error) {
                showToast('复制失败，请检查浏览器剪贴板权限', 'error');
            }
        }

        async function loadGlobalConfig() {
            const result = await apiRequest('getGlobalConfig');

            if (!result.success) {
                showToast('加载全局配置失败：' + (result.error || '未知错误'), 'error');
                return;
            }

            const config = result.data;
            document.getElementById('globalPurchaseUrl').value = config.purchaseUrl || 'https://kkw.8u9.top/zsxqhelper';
            document.getElementById('globalPopupMessage').value = config.globalPopupMessage || '';
            document.getElementById('defaultTrialTasks').value = config.defaultTrialTasks || 10;
        }

        async function loadFeatureConfig() {
            const result = await apiRequest('getFeatureConfig');

            if (!result.success) {
                showToast('加载功能配置失败：' + (result.error || '未知错误'), 'error');
                return;
            }

            const config = result.data;
            document.getElementById('feature-export').checked = config.export !== false;
            document.getElementById('feature-download').checked = config.download !== false;
            document.getElementById('feature-turboDownload').checked = config.turboDownload !== false;
            document.getElementById('feature-search').checked = config.search !== false;
            document.getElementById('feature-searchResult').checked = config.searchResult !== false;
            document.getElementById('feature-column').checked = config.column !== false;
            document.getElementById('feature-digest').checked = config.digest !== false;
            document.getElementById('feature-backup').checked = config.backup !== false;
        }

        async function saveGlobalConfig() {
            const button = document.getElementById('saveGlobalConfigBtn');
            const purchaseUrl = document.getElementById('globalPurchaseUrl').value.trim();
            const globalPopupMessage = document.getElementById('globalPopupMessage').value.trim();
            const defaultTrialTasks = parseInt(document.getElementById('defaultTrialTasks').value, 10) || 10;

            if (!purchaseUrl) {
                showToast('请输入购买链接', 'error');
                return;
            }

            if (defaultTrialTasks < 1 || defaultTrialTasks > 1000) {
                showToast('试用次数必须在 1-1000 之间', 'error');
                return;
            }

            try {
                new URL(purchaseUrl);
            } catch (e) {
                showToast('请输入有效的 URL（如 https://example.com）', 'error');
                return;
            }

            setButtonBusy(button, true, '保存中...');

            try {
                const result = await apiRequest('updateGlobalConfig', {
                    purchaseUrl,
                    globalPopupMessage,
                    defaultTrialTasks
                });

                if (result.success) {
                    showToast(`全局配置已保存，默认试用次数 ${defaultTrialTasks} 次`);
                } else {
                    showToast('保存失败：' + (result.error || '未知错误'), 'error');
                }
            } finally {
                setButtonBusy(button, false);
            }
        }

        // 页面加载时初始化
        window.onload = () => {
            if (!getAdminSession()) {
                return;
            }

            initializeAdminTabs();
        };

        let selectedLicenses = new Set();
        const periodLabelMap = {
            0: '永久',
            30: '30天',
            90: '90天',
            180: '180天',
            365: '365天',
            730: '730天',
            1825: '1825天'
        };
        const featureLabelMap = {
            export: '帖子导出',
            download: '文件下载',
            turboDownload: '极速下载',
            search: '关键词搜索',
            searchResult: '搜索结果导出',
            column: '专栏导出',
            digest: '精华导出',
            backup: '全量备份'
        };
        const logActionLabelMap = {
            activate: '密钥激活',
            trial_activate: '试用激活',
            trial_task: '试用任务',
            batch_generate: '批量生成',
            delete: '删除密钥',
            reset_trial_tasks: '重置试用',
            delete_trial_device: '删除设备',
            set_expired: '设置过期',
            update_feature_config: '功能配置'
        };

        function getPeriodLabel(days) {
            return periodLabelMap[days] || `${days}天`;
        }

        function getFeatureLabel(name) {
            return featureLabelMap[name] || name;
        }

        function getLogActionLabel(action) {
            return logActionLabelMap[action] || action || '未知操作';
        }

        function createDownloadFile(filename, content, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        }

        function getCurrentPagedLicenses() {
            const start = (currentLicensesPage - 1) * licensesPageSize;
            const end = start + licensesPageSize;
            return filteredLicensesCache.slice(start, end);
        }

        function syncSelectedLicenses() {
            const validLicenses = new Set(allLicensesCache.map(item => item.license));
            selectedLicenses = new Set(
                Array.from(selectedLicenses).filter((license) => validLicenses.has(license))
            );
        }

        function updateLicenseBulkActions() {
            const count = selectedLicenses.size;
            const copyBtn = document.getElementById('copySelectedLicensesBtn');
            const deleteBtn = document.getElementById('deleteSelectedLicensesBtn');

            if (copyBtn) {
                copyBtn.disabled = count === 0;
                copyBtn.textContent = count > 0 ? `📋 复制选中 (${count})` : '📋 复制选中';
            }

            if (deleteBtn) {
                deleteBtn.disabled = count === 0;
                deleteBtn.textContent = count > 0 ? `🗑️ 删除选中 (${count})` : '🗑️ 删除选中';
            }
        }

        function copySingleLicense(license) {
            navigator.clipboard.writeText(license)
                .then(() => showToast(`已复制密钥 ${license}`))
                .catch(() => showToast('复制失败，请检查剪贴板权限', 'error'));
        }

        async function copySelectedLicenses() {
            if (selectedLicenses.size === 0) {
                showToast('请先勾选要复制的密钥', 'error');
                return;
            }

            try {
                await navigator.clipboard.writeText(Array.from(selectedLicenses).join('\n'));
                showToast(`已复制 ${selectedLicenses.size} 个密钥`);
            } catch (error) {
                showToast('复制失败，请检查剪贴板权限', 'error');
            }
        }

        async function deleteSelectedLicenses() {
            if (selectedLicenses.size === 0) {
                showToast('请先勾选要删除的密钥', 'error');
                return;
            }

            if (!confirm(`确定要删除选中的 ${selectedLicenses.size} 个密钥吗？此操作不可恢复。`)) {
                return;
            }

            const button = document.getElementById('deleteSelectedLicensesBtn');
            const licenses = Array.from(selectedLicenses);
            let successCount = 0;
            const failedLicenses = [];

            setButtonBusy(button, true, '删除中...');

            try {
                for (const license of licenses) {
                    const result = await apiRequest('deleteLicense', { license });
                    if (result.success) {
                        successCount += 1;
                        selectedLicenses.delete(license);
                    } else {
                        failedLicenses.push(license);
                    }
                }

                await loadLicenses();
                loadDashboard();

                if (failedLicenses.length === 0) {
                    showToast(`已删除 ${successCount} 个密钥`);
                } else {
                    showToast(`已删除 ${successCount} 个密钥，${failedLicenses.length} 个删除失败`, 'error');
                }
            } finally {
                setButtonBusy(button, false);
            }
        }

        function exportTrialDevices() {
            if (!filteredTrialDevices.length) {
                showToast('当前没有可导出的试用设备', 'error');
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            let content = '设备ID,剩余次数,首次使用,最后使用,IP地址\n';
            filteredTrialDevices.forEach((device) => {
                content += `${device.deviceId},${device.remainingTasks},${device.firstSeen},${device.lastSeen},${device.lastIP}\n`;
            });
            createDownloadFile(`trial-devices-${timestamp}.csv`, content, 'text/csv');
            showToast(`已导出 ${filteredTrialDevices.length} 台试用设备`);
        }

        function exportLogs() {
            if (!allLogs.length) {
                showToast('当前没有可导出的日志', 'error');
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            let content = '时间,动作,密钥,设备ID,IP,详情\n';
            allLogs.forEach((log) => {
                const details = [
                    log.remainingTasks ? `剩余:${log.remainingTasks}` : '',
                    log.oldTasks !== undefined ? `旧值:${log.oldTasks}` : '',
                    log.newTasks !== undefined ? `新值:${log.newTasks}` : '',
                    log.count !== undefined ? `数量:${log.count}` : ''
                ].filter(Boolean).join(' | ');
                content += `${log.timestamp},${getLogActionLabel(log.action)},${log.license || ''},${log.deviceId || ''},${log.ip || ''},${details}\n`;
            });
            createDownloadFile(`admin-logs-${timestamp}.csv`, content, 'text/csv');
            showToast(`已导出 ${allLogs.length} 条日志`);
        }

        function renderDashboardHealth(overview) {
            const system = overview.system;
            const config = overview.config;
            const features = overview.features;
            const healthEl = document.getElementById('dashboardHealth');
            if (!healthEl) return;

            const purchaseDomain = config.purchaseUrl ? (() => {
                try {
                    return new URL(config.purchaseUrl).host;
                } catch (error) {
                    return config.purchaseUrl;
                }
            })() : '未配置';

            healthEl.innerHTML = `
                <div class="dashboard-inline-list">
                    <span class="status-chip ${system.cosConfigured ? 'ok' : 'warn'}">${system.cosConfigured ? 'COS 已连接' : '内存模式'}</span>
                    <span class="status-chip ${system.adminLoginConfigured ? 'ok' : 'warn'}">${system.adminLoginConfigured ? '后台登录已配置' : '后台登录未配置'}</span>
                    <span class="status-chip ${features.disabledCount > 0 ? 'warn' : 'ok'}">${features.disabledCount > 0 ? `已禁用 ${features.disabledCount} 项功能` : '功能全开'}</span>
                    <span class="status-chip ${features.limitedCount > 0 ? 'info' : 'ok'}">${features.limitedCount > 0 ? `有限制 ${features.limitedCount} 项` : '无限制功能'}</span>
                </div>
                <div class="dashboard-list">
                    <div class="dashboard-list-item">
                        <div>
                            <strong>默认试用次数</strong>
                            <small>新用户首次试用可用次数</small>
                        </div>
                        <span>${config.defaultTrialTasks} 次</span>
                    </div>
                    <div class="dashboard-list-item">
                        <div>
                            <strong>购买链接</strong>
                            <small>${purchaseDomain}</small>
                        </div>
                        <span>${config.purchaseUrl ? '已配置' : '未配置'}</span>
                    </div>
                    <div class="dashboard-list-item">
                        <div>
                            <strong>全局弹窗</strong>
                            <small>${config.globalPopupMessage ? '已有内容' : '当前为空'}</small>
                        </div>
                        <span>${config.globalPopupMessage ? '已开启' : '未设置'}</span>
                    </div>
                    <div class="dashboard-list-item">
                        <div>
                            <strong>单密钥限制覆盖</strong>
                            <small>已配置单独功能限制的密钥数量</small>
                        </div>
                        <span>${features.licenseOverrideCount} 个</span>
                    </div>
                </div>
            `;
        }

        function renderDashboardPeriods(overview) {
            const periodsEl = document.getElementById('dashboardPeriods');
            if (!periodsEl) return;

            const byPeriod = overview.stats.byPeriod || {};
            const rows = Object.entries(byPeriod).sort((a, b) => Number(a[0]) - Number(b[0]));

            periodsEl.innerHTML = rows.length
                ? `<div class="dashboard-list">${rows.map(([days, data]) => `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${getPeriodLabel(Number(days))}</strong>
                            <small>总数 ${data.total} / 生效 ${data.active} / 未绑定 ${data.unused}</small>
                        </div>
                        <span>${data.bound} 已绑</span>
                    </div>
                `).join('')}</div>`
                : '<p class="empty-state">暂无授权分布数据</p>';
        }

        function summarizeRecentLog(log) {
            if (!log) return '无详情';

            if (log.action === 'activate') {
                return `密钥 ${log.license || '-'} 绑定到 ${log.deviceId || '-'}`;
            }

            if (log.action === 'trial_task') {
                return `设备 ${log.deviceId || '-'} 还剩 ${log.remainingTasks ?? '-'} 次`;
            }

            if (log.action === 'batch_generate') {
                return `生成 ${log.count || 0} 个 ${getPeriodLabel(Number(log.days || 0))} 密钥`;
            }

            if (log.action === 'reset_trial_tasks') {
                return `设备 ${log.deviceId || '-'} 从 ${log.oldTasks ?? '-'} 次改为 ${log.newTasks ?? '-'} 次`;
            }

            return [log.license, log.deviceId, log.ip].filter(Boolean).join(' / ') || '已记录操作';
        }

        function renderDashboardRecentLogs(overview) {
            const logsEl = document.getElementById('dashboardRecentLogs');
            if (!logsEl) return;

            const logs = overview.recentLogs || [];
            logsEl.innerHTML = logs.length
                ? `<div class="dashboard-list">${logs.map((log) => `
                    <div class="dashboard-list-item">
                        <div>
                            <strong>${getLogActionLabel(log.action)}</strong>
                            <small>${summarizeRecentLog(log)}</small>
                        </div>
                        <span>${escapeHtml(log.timestamp)}</span>
                    </div>
                `).join('')}</div>`
                : '<p class="empty-state">最近还没有管理操作记录</p>';
        }

        async function loadDashboard() {
            const refreshBtn = document.getElementById('dashboardRefreshBtn');
            setButtonBusy(refreshBtn, true, '刷新中...');

            try {
                const result = await apiRequest('getAdminOverview');

                if (!result.success) {
                    updatePageMeta('dashboardMeta', '仪表盘概览加载失败');
                    showToast('加载仪表盘失败：' + (result.error || '未知错误'), 'error');
                    return;
                }

                const overview = result.data;
                const stats = overview.stats;
                document.getElementById('totalLicenses').textContent = stats.totalLicenses;
                document.getElementById('activeLicenses').textContent = stats.activeLicenses;
                document.getElementById('boundDevices').textContent = stats.boundDevices;
                document.getElementById('trialDevices').textContent = stats.trialDevices;

                updatePageMeta(
                    'dashboardMeta',
                    `存储：${overview.system.storageMode.toUpperCase()} · 服务器时间：${overview.system.serverTime} · 已启用功能 ${overview.features.enabledCount} 项`
                );
                renderDashboardHealth(overview);
                renderDashboardPeriods(overview);
                renderDashboardRecentLogs(overview);
            } finally {
                setButtonBusy(refreshBtn, false);
            }
        }

        async function loadLicenses() {
            const result = await apiRequest('listAllLicenses');
            const tableEl = document.getElementById('licensesTable');

            if (!result.success) {
                tableEl.innerHTML = '<p>加载失败：' + escapeHtml(result.error || '未知错误') + '</p>';
                updatePageMeta('licensesMeta', '加载密钥数据失败');
                updateLicenseBulkActions();
                return;
            }

            allLicensesCache = result.data.licenses || [];
            syncSelectedLicenses();
            filterLicenses();
        }

        function filterLicenses() {
            const statusFilter = document.getElementById('filterStatus')?.value || 'all';
            const bindingFilter = document.getElementById('filterBinding')?.value || 'all';
            const configFilter = document.getElementById('filterConfigState')?.value || 'all';
            const daysFilter = document.getElementById('filterDays')?.value || 'all';
            const keyword = (document.getElementById('searchLicense')?.value || '').trim().toLowerCase();

            let filtered = [...allLicensesCache];

            if (statusFilter !== 'all') {
                if (statusFilter === 'expired') {
                    filtered = filtered.filter((license) => license.isExpired);
                } else {
                    filtered = filtered.filter((license) => license.status === statusFilter && !license.isExpired);
                }
            }

            if (bindingFilter !== 'all') {
                filtered = filtered.filter((license) => {
                    const isBound = license.deviceId && license.deviceId !== '未绑定';
                    return bindingFilter === 'bound' ? isBound : !isBound;
                });
            }

            if (configFilter !== 'all') {
                filtered = filtered.filter((license) => {
                    const hasConfig = Boolean((license.popupMessage || '').trim());
                    return configFilter === 'configured' ? hasConfig : !hasConfig;
                });
            }

            if (daysFilter !== 'all') {
                filtered = filtered.filter((license) => license.days === parseInt(daysFilter, 10));
            }

            if (keyword) {
                filtered = filtered.filter((license) => {
                    const haystack = [
                        license.license,
                        license.deviceId,
                        license.created,
                        license.activatedAt,
                        license.expire,
                        license.popupMessage,
                        license.lastIP
                    ].join(' ').toLowerCase();
                    return haystack.includes(keyword);
                });
            }

            filteredLicensesCache = filtered;
            currentLicensesPage = 1;
            renderLicenses();
        }

        function renderLicenses(licenses = filteredLicensesCache) {
            const tableEl = document.getElementById('licensesTable');
            const start = (currentLicensesPage - 1) * licensesPageSize;
            const end = start + licensesPageSize;
            const pagedLicenses = licenses.slice(start, end);
            const totalPages = Math.ceil(licenses.length / licensesPageSize);

            updatePageMeta(
                'licensesMeta',
                `共 ${allLicensesCache.length} 个密钥，筛选后 ${licenses.length} 个，已勾选 ${selectedLicenses.size} 个`
            );

            if (licenses.length === 0) {
                tableEl.innerHTML = '<p class="empty-state">没有匹配的密钥记录</p>';
                updateLicenseBulkActions();
                return;
            }

            const allPagedSelected = pagedLicenses.length > 0 && pagedLicenses.every((item) => selectedLicenses.has(item.license));
            let html = '<table><thead><tr><th><input type="checkbox" id="toggleCurrentLicenses" class="table-checkbox"' + (allPagedSelected ? ' checked' : '') + '></th><th>密钥</th><th>期限</th><th>状态</th><th>设备ID</th><th>创建时间</th><th>激活时间</th><th>过期时间</th><th>剩余天数</th><th>配置</th><th>操作</th></tr></thead><tbody>';

            pagedLicenses.forEach((lic) => {
                const now = Date.now();
                const isPermanent = lic.days === 0;
                const daysLeft = isPermanent ? Infinity : (lic.expireTime ? Math.ceil((lic.expireTime - now) / (1000 * 60 * 60 * 24)) : lic.days);

                let statusBadge = '<span class="badge badge-secondary">未知</span>';
                if (lic.isExpired) statusBadge = '<span class="badge badge-danger">已过期</span>';
                else if (lic.status === 'unused') statusBadge = '<span class="badge badge-success">未使用</span>';
                else if (lic.status === 'activated') statusBadge = '<span class="badge badge-warning">已激活</span>';

                let daysLeftBadge = '';
                if (isPermanent) {
                    daysLeftBadge = '<span class="badge badge-success">永久</span>';
                } else if (lic.status === 'unused') {
                    daysLeftBadge = `<span class="badge badge-success">激活后${escapeHtml(lic.days)}天</span>`;
                } else if (!lic.isExpired) {
                    if (daysLeft <= 7) daysLeftBadge = `<span class="badge badge-danger">${escapeHtml(daysLeft)}天</span>`;
                    else if (daysLeft <= 30) daysLeftBadge = `<span class="badge badge-warning">${escapeHtml(daysLeft)}天</span>`;
                    else daysLeftBadge = `<span class="badge badge-success">${escapeHtml(daysLeft)}天</span>`;
                }

                const periodText = isPermanent ? '永久' : `${escapeHtml(lic.days)}天`;
                const activatedTime = lic.status === 'unused' ? '-' : escapeHtml(lic.activatedAt || '-');
                const expireDisplay = lic.status === 'unused' ? '待激活' : escapeHtml(lic.expire);
                const hasConfig = Boolean((lic.popupMessage || '').trim());
                const configBadge = hasConfig ? '<span class="badge badge-success">已配置</span>' : '<span class="badge badge-secondary">未配置</span>';

                html += `<tr>
                    <td><input type="checkbox" class="table-checkbox license-row-checkbox" data-license="${encodeDataValue(lic.license)}"${selectedLicenses.has(lic.license) ? ' checked' : ''}></td>
                    <td style="font-family: monospace; font-size: 11px;">${escapeHtml(lic.license)}</td>
                    <td>${periodText}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family: monospace; font-size: 10px;">${escapeHtml(lic.deviceId)}</td>
                    <td>${escapeHtml(lic.created)}</td>
                    <td>${activatedTime}</td>
                    <td>${expireDisplay}</td>
                    <td>${daysLeftBadge}</td>
                    <td>${configBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary copy-license-btn" data-license="${encodeDataValue(lic.license)}">复制</button>
                        <button class="btn btn-sm btn-primary edit-license-config-btn" data-license="${encodeDataValue(lic.license)}" data-message="${encodeDataValue(lic.popupMessage || '')}">配置</button>
                        <button class="btn btn-sm btn-secondary edit-license-limits-btn" data-license="${encodeDataValue(lic.license)}">限制</button>
                        <button class="btn btn-sm btn-danger delete-license-btn" data-license="${encodeDataValue(lic.license)}">删除</button>
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';

            if (totalPages > 1) {
                html += '<div style="margin-top: 20px; text-align: center;">';
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage - 1})" ${currentLicensesPage === 1 ? 'disabled' : ''}>上一页</button>`;
                html += `<span style="margin: 0 15px;">第 ${currentLicensesPage} / ${totalPages} 页 (共 ${licenses.length} 条)</span>`;
                html += `<button class="btn btn-primary" onclick="changeLicensesPage(${currentLicensesPage + 1})" ${currentLicensesPage === totalPages ? 'disabled' : ''}>下一页</button>`;
                html += '</div>';
            }

            tableEl.innerHTML = html;

            document.getElementById('toggleCurrentLicenses')?.addEventListener('change', (event) => {
                pagedLicenses.forEach((license) => {
                    if (event.target.checked) selectedLicenses.add(license.license);
                    else selectedLicenses.delete(license.license);
                });
                renderLicenses();
            });

            tableEl.querySelectorAll('.license-row-checkbox').forEach((checkbox) => {
                checkbox.addEventListener('change', () => {
                    const license = decodeDataValue(checkbox.dataset.license);
                    if (checkbox.checked) selectedLicenses.add(license);
                    else selectedLicenses.delete(license);
                    updateLicenseBulkActions();
                    const toggleCurrent = document.getElementById('toggleCurrentLicenses');
                    if (toggleCurrent) {
                        toggleCurrent.checked = getCurrentPagedLicenses().every((item) => selectedLicenses.has(item.license));
                    }
                });
            });

            tableEl.querySelectorAll('.copy-license-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    copySingleLicense(decodeDataValue(btn.dataset.license));
                });
            });

            tableEl.querySelectorAll('.edit-license-config-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    editLicenseConfig(
                        decodeDataValue(btn.dataset.license),
                        decodeDataValue(btn.dataset.message)
                    );
                });
            });

            tableEl.querySelectorAll('.edit-license-limits-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    showLicenseLimitsConfig(decodeDataValue(btn.dataset.license));
                });
            });

            tableEl.querySelectorAll('.delete-license-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    deleteLicense(decodeDataValue(btn.dataset.license));
                });
            });

            updateLicenseBulkActions();
        }

        function closeLicenseConfigModal() {
            document.getElementById('licenseConfigModal')?.remove();
        }

        function editLicenseConfig(license, currentMessage = '') {
            closeLicenseConfigModal();

            const modalHtml = `
                <div id="licenseConfigModal" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div style="background: white; border-radius: 14px; padding: 28px; width: min(680px, 92vw); box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);">
                        <h2 style="margin-bottom: 10px;">编辑密钥弹窗</h2>
                        <p style="color: #64748b; margin-bottom: 18px;">密钥：<code style="background: #f8fafc; padding: 4px 8px; border-radius: 6px;">${escapeHtml(license)}</code></p>
                        <textarea id="licenseConfigTextarea" class="form-control" rows="6" placeholder="输入激活后要展示的弹窗内容，留空表示清除该密钥弹窗">${escapeHtml(currentMessage)}</textarea>
                        <div style="margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn btn-secondary" onclick="closeLicenseConfigModal()">取消</button>
                            <button id="saveLicenseConfigBtn" class="btn btn-primary">💾 保存弹窗</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.getElementById('saveLicenseConfigBtn')?.addEventListener('click', async () => {
                const saveBtn = document.getElementById('saveLicenseConfigBtn');
                const popupMessage = document.getElementById('licenseConfigTextarea')?.value || '';

                setButtonBusy(saveBtn, true, '保存中...');
                try {
                    await updateLicenseConfig(license, popupMessage);
                    closeLicenseConfigModal();
                } catch (error) {
                    // 错误提示已在 updateLicenseConfig 中处理
                } finally {
                    setButtonBusy(saveBtn, false);
                }
            });
        }

        async function updateLicenseConfig(license, popupMessage) {
            const result = await apiRequest('updateLicenseConfig', {
                license,
                popupMessage
            });

            if (result.success) {
                showToast(`密钥 ${license} 的弹窗配置已更新`);
                await loadLicenses();
            } else {
                showToast('更新失败：' + (result.error || '未知错误'), 'error');
                throw new Error(result.error || 'UPDATE_LICENSE_CONFIG_FAILED');
            }
        }

        async function deleteLicense(license) {
            if (!confirm(`确定要删除密钥 ${license} 吗？`)) return;

            const result = await apiRequest('deleteLicense', { license });

            if (result.success) {
                selectedLicenses.delete(license);
                showToast(`密钥 ${license} 已删除`);
                await loadLicenses();
                loadDashboard();
            } else {
                showToast('删除失败：' + (result.error || '未知错误'), 'error');
            }
        }
