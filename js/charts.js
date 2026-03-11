/**
 * Charts Module
 * Handles price distribution charts and statistics
 */

export class ChartManager {
    constructor() {
        this.priceDistributionPanel = document.getElementById('price-distribution-panel');
        this.priceHistogramCanvas = document.getElementById('price-histogram');
        this.distributionStatsDiv = document.getElementById('distribution-stats');
    }

    /**
     * Show price distribution chart for nearby stations
     */
    showPriceDistribution(stations) {
        if (stations.length === 0) {
            this.priceDistributionPanel.classList.add('hidden');
            return;
        }
        
        // Extract prices
        const prices = stations.map(s => s.price).sort((a, b) => a - b);
        
        // Calculate statistics
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const median = prices[Math.floor(prices.length / 2)];
        
        // Create histogram bins
        const numBins = 10;
        const binWidth = (max - min) / numBins;
        const bins = Array(numBins).fill(0);
        const binLabels = [];
        
        for (let i = 0; i < numBins; i++) {
            binLabels.push((min + i * binWidth).toFixed(3));
        }
        
        prices.forEach(price => {
            const binIndex = Math.min(Math.floor((price - min) / binWidth), numBins - 1);
            bins[binIndex]++;
        });
        
        // Draw histogram
        this.drawHistogram(bins, binLabels, min, max);
        
        // Show statistics
        this.distributionStatsDiv.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Minimum</div>
                <div class="stat-value">€${min.toFixed(3)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Maximum</div>
                <div class="stat-value">€${max.toFixed(3)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Average</div>
                <div class="stat-value">€${avg.toFixed(3)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Median</div>
                <div class="stat-value">€${median.toFixed(3)}</div>
            </div>
        `;
        
        // Show panel
        this.priceDistributionPanel.classList.remove('hidden');
    }

    /**
     * Draw histogram on canvas
     */
    drawHistogram(bins, binLabels, minPrice, maxPrice) {
        const canvas = this.priceHistogramCanvas;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const padding = 25;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        const barWidth = chartWidth / bins.length;
        const maxBinValue = Math.max(...bins);
        
        // Draw bars
        bins.forEach((count, i) => {
            const barHeight = (count / maxBinValue) * chartHeight;
            const x = padding + i * barWidth;
            const y = canvas.height - padding - barHeight;
            
            // Create gradient for bars - indigo
            const gradient = ctx.createLinearGradient(x, y, x, canvas.height - padding);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#818cf8');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x + 2, y, barWidth - 4, barHeight, 3);
            ctx.fill();
            
            // Add count label on top of bar
            if (count > 0) {
                ctx.fillStyle = '#64748b';
                ctx.font = '9px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(count.toString(), x + barWidth / 2, y - 3);
            }
        });
        
        // Draw axes
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Add labels
        ctx.fillStyle = '#64748b';
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`€${minPrice.toFixed(2)}`, padding, canvas.height - padding + 12);
        ctx.textAlign = 'right';
        ctx.fillText(`€${maxPrice.toFixed(2)}`, canvas.width - padding, canvas.height - padding + 12);
    }

    /**
     * Hide price distribution panel
     */
    hide() {
        this.priceDistributionPanel.classList.add('hidden');
    }
}
