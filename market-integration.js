/**
 * BSC Prediction Market - Frontend Integration
 * 
 * 合约地址 (BSC 测试网):
 * - BPM Token: 0xF10b6954E7974ebCDd79D0c0f8ADdE434A9ac683
 * - Prediction Market: 0xe03FC221777fA24583552d413ea240526343d757
 */

class BSCPredictionMarketFrontend {
    constructor(config = {}) {
        // API 配置
        this.apiBaseUrl = config.apiBaseUrl || 'http://localhost:8000';
        
        // 合约地址
        this.contractAddress = config.contractAddress || '0xe03FC221777fA24583552d413ea240526343d757';
        this.tokenAddress = config.tokenAddress || '0xF10b6954E7974ebCDd79D0c0f8ADdE434A9ac683';
        
        this.web3 = null;
        this.userAddress = null;
        this.userBalance = { bnb: 0, bpm: 0 };
        this.markets = [];
        this.selectedMarket = null;
    }
    
    async init() {
        console.log('🚀 初始化 BSC 预测市场前端...');
        this.initWeb3();
        await this.loadMarkets();
        this.setupEventListeners();
        console.log('✅ 前端初始化完成!');
    }
    
    initWeb3() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            console.log('✅ MetaMask 已检测到');
        } else if (typeof window.web3 !== 'undefined') {
            this.web3 = new Web3(window.web3.currentProvider);
        }
    }
    
    setupEventListeners() {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
    }
    
    async connectWallet() {
        if (!this.web3) {
            this.showNotification('请安装 MetaMask 钱包!', 'error');
            return;
        }
        
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            this.userAddress = accounts[0];
            await this.updateWalletDisplay();
            
            window.ethereum.on('accountsChanged', (accounts) => {
                this.userAddress = accounts[0];
                this.updateWalletDisplay();
            });
            
            this.showNotification('钱包连接成功!', 'success');
        } catch (error) {
            this.showNotification('连接失败: ' + error.message, 'error');
        }
    }
    
    async updateWalletDisplay() {
        if (!this.userAddress) return;
        
        const addressElement = document.getElementById('walletAddress');
        if (addressElement) {
            addressElement.textContent = this.userAddress.slice(0, 6) + '...' + this.userAddress.slice(-4);
        }
        
        try {
            const bnbBalance = await this.web3.eth.getBalance(this.userAddress);
            this.userBalance.bnb = parseFloat(this.web3.utils.fromWei(bnbBalance, 'ether'));
            
            const balanceElement = document.getElementById('walletBalance');
            if (balanceElement) {
                balanceElement.innerHTML = `<span>${this.userBalance.bnb.toFixed(4)}</span> BNB`;
            }
            
            const walletInfo = document.getElementById('walletInfo');
            const connectBtn = document.getElementById('connectWallet');
            
            if (walletInfo && connectBtn) {
                walletInfo.classList.add('show');
                connectBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('获取余额失败:', error);
        }
    }
    
    async loadMarkets() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/markets?status=Active`);
            const data = await response.json();
            
            if (Array.isArray(data)) {
                this.markets = data;
                this.renderMarkets();
            }
        } catch (error) {
            this.loadMockMarkets();
        }
    }
    
    loadMockMarkets() {
        this.markets = [
            {
                id: 1,
                question: '上证指数今日收盘 > 3450 点',
                category: 'A-Share',
                status: 'Active',
                total_volume: 83700,
                yes_odds: 1.85,
                no_odds: 2.05,
                yes_bettors: 65,
                no_bettors: 35,
                end_time: new Date(Date.now() + 4 * 60 * 60 * 1000)
            },
            {
                id: 2,
                question: '创业板指 > 2400 点',
                category: 'A-Share',
                status: 'Active',
                total_volume: 52300,
                yes_odds: 2.25,
                no_odds: 1.75,
                yes_bettors: 45,
                no_bettors: 55,
                end_time: new Date(Date.now() + 4 * 60 * 60 * 1000)
            }
        ];
        this.renderMarkets();
    }
    
    renderMarkets() {
        const container = document.getElementById('markets-list');
        if (!container) return;
        
        container.innerHTML = this.markets.map(market => `
            <div class="prediction-card" data-market-id="${market.id}">
                <div class="prediction-header">
                    <div>
                        <div class="prediction-title">${market.question}</div>
                        <div class="prediction-time">
                            结算时间: ${new Date(market.end_time).toLocaleString('zh-CN')}
                        </div>
                    </div>
                </div>
                <div class="prediction-bar">
                    <div class="prediction-fill" style="width: ${market.yes_bettors}%"></div>
                </div>
                <div class="prediction-footer">
                    <div class="odds-section">
                        <div class="odds-btn up" onclick="event.stopPropagation(); frontend.placeBet(${market.id}, 'yes')">
                            <div>涨 ✅</div>
                            <div style="font-size: 16px;">${market.yes_odds.toFixed(2)}x</div>
                        </div>
                        <div class="odds-btn down" onclick="event.stopPropagation(); frontend.placeBet(${market.id}, 'no')">
                            <div>跌 ❌</div>
                            <div style="font-size: 16px;">${market.no_odds.toFixed(2)}x</div>
                        </div>
                    </div>
                </div>
                <div class="pool-info">
                    总奖池: ${(market.total_volume / 1000).toFixed(1)}K BNB | 
                    参与人数: ${market.yes_bettors + market.no_bettors}
                </div>
            </div>
        `).join('');
    }
    
    placeBet(marketId, outcome) {
        if (!this.userAddress) {
            this.showNotification('请先连接钱包!', 'warning');
            this.connectWallet();
            return;
        }
        this.openBetModal(marketId, outcome);
    }
    
    openBetModal(marketId, defaultOutcome = 'yes') {
        const modal = document.getElementById('betModal');
        if (!modal) return;
        
        const market = this.markets.find(m => m.id === marketId);
        if (!market) return;
        
        this.selectedMarket = market;
        
        document.getElementById('modalTitle').textContent = market.question;
        document.getElementById('upProb').textContent = `${market.yes_bettors}%`;
        document.getElementById('downProb').textContent = `${market.no_bettors}%`;
        document.getElementById('upBar').style.width = `${market.yes_bettors}%`;
        document.getElementById('downBar').style.width = `${market.no_bettors}%`;
        
        modal.classList.add('show');
    }
    
    closeBetModal() {
        const modal = document.getElementById('betModal');
        if (modal) modal.classList.remove('show');
    }
    
    setAmount(amount) {
        const input = document.getElementById('betAmount');
        if (input) {
            input.value = amount;
            this.updatePayout();
        }
    }
    
    updatePayout() {
        const amount = parseFloat(document.getElementById('betAmount').value) || 0;
        const odds = this.selectedMarket?.yes_odds || 1.85;
        const profit = amount * (odds - 1);
        
        const payoutElement = document.getElementById('payoutAmount');
        if (payoutElement) {
            payoutElement.textContent = `+${profit.toFixed(2)} BNB`;
        }
    }
    
    async submitBet(outcome) {
        if (!this.userAddress) {
            this.showNotification('请先连接钱包!', 'error');
            return;
        }
        
        const amountInput = document.getElementById('betAmount');
        const amount = parseFloat(amountInput.value);
        
        if (!amount || amount <= 0) {
            this.showNotification('请输入有效的投注金额!', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    market_id: this.selectedMarket.id,
                    amount: amount,
                    is_yes: outcome === 'yes'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    `✅ 投注成功!\n方向: ${outcome === 'yes' ? '涨' : '跌'}\n金额: ${amount} BNB\n交易: ${result.transaction_hash.slice(0, 10)}...`,
                    'success'
                );
                this.closeBetModal();
                await this.updateWalletDisplay();
            } else {
                this.showNotification('投注失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('投注失败:', error);
            this.showNotification(
                `✅ 演示模式: 投注成功!\n方向: ${outcome === 'yes' ? '涨' : '跌'}\n金额: ${amount} BNB`,
                'success'
            );
            this.closeBetModal();
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span class="notification-message">${message.replace(/\n/g, '<br>')}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
        `;
        
        notification.style.cssText = `
            position: fixed; top: 100px; right: 20px;
            background: ${type === 'success' ? '#21A366' : type === 'error' ? '#EE4B2B' : type === 'warning' ? '#F0B90B' : '#1a1a24'};
            color: white; padding: 16px 20px; border-radius: 12px;
            max-width: 350px; z-index: 9999;
            display: flex; align-items: center; gap: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

const frontend = new BSCPredictionMarketFrontend({
    apiBaseUrl: 'http://localhost:8000',
    contractAddress: '0xe03FC221777fA24583552d413ea240526343d757',
    tokenAddress: '0xF10b6954E7974ebCDd79D0c0f8ADdE434A9ac683'
});

document.addEventListener('DOMContentLoaded', () => {
    frontend.init();
});

window.frontend = frontend;
