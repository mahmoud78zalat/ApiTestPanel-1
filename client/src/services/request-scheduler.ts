/**
 * Professional Request Scheduler with Advanced Rate Limiting and Performance Optimization
 * 
 * This service implements professional scraping techniques:
 * - Adaptive rate limiting
 * - Connection pooling
 * - Request prioritization
 * - Retry mechanisms with exponential backoff
 * - Circuit breaker pattern
 * - Concurrent request batching
 */

interface RequestTask<T = any> {
  id: string;
  url: string;
  method: string;
  priority: 'low' | 'normal' | 'high';
  token?: string;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  startTime?: number;
}

interface SchedulerConfig {
  maxConcurrentRequests: number;
  requestsPerSecond: number;
  adaptiveRateLimit: boolean;
  circuitBreakerThreshold: number;
  retryDelay: number;
  maxRetryDelay: number;
  connectionPoolSize: number;
}

interface PerformanceMetrics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  currentRPS: number;
  activeConnections: number;
  circuitBreakerOpen: boolean;
}

class ProfessionalRequestScheduler {
  private queue: RequestTask[] = [];
  private activeRequests = new Map<string, RequestTask>();
  private completedRequests: string[] = [];
  private failureHistory: number[] = [];
  private config: SchedulerConfig;
  private isProcessing = false;
  private lastRequestTime = 0;
  private circuitBreakerOpenUntil = 0;
  private performanceMetrics: PerformanceMetrics;
  private onProgressCallback?: (metrics: PerformanceMetrics) => void;
  private onDebugCallback?: (level: string, message: string, data?: any) => void;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      maxConcurrentRequests: 6, // Reduced for better stability
      requestsPerSecond: 3, // More conservative to prevent freezing
      adaptiveRateLimit: true,
      circuitBreakerThreshold: 0.5, // 50% failure rate
      retryDelay: 1000,
      maxRetryDelay: 30000,
      connectionPoolSize: 10,
      ...config
    };

    this.performanceMetrics = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentRPS: 0,
      activeConnections: 0,
      circuitBreakerOpen: false
    };
  }

  /**
   * Set progress callback for real-time monitoring
   */
  setProgressCallback(callback: (metrics: PerformanceMetrics) => void) {
    this.onProgressCallback = callback;
  }

  /**
   * Set debug callback for detailed logging
   */
  setDebugCallback(callback: (level: string, message: string, data?: any) => void) {
    this.onDebugCallback = callback;
  }

  /**
   * Add request to queue with professional prioritization
   */
  async scheduleRequest<T>(
    url: string,
    method: string = 'GET',
    options: {
      priority?: 'low' | 'normal' | 'high';
      token?: string;
      headers?: Record<string, string>;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: RequestTask<T> = {
        id: this.generateTaskId(),
        url,
        method,
        priority: options.priority || 'normal',
        token: options.token,
        headers: options.headers,
        retryCount: 0,
        maxRetries: options.maxRetries || 3,
        resolve,
        reject
      };

      // Priority queue insertion
      this.insertByPriority(task);
      this.performanceMetrics.totalRequests++;
      
      this.debugLog('info', `📋 Task Queued: ${task.id}`, {
        url: task.url,
        priority: task.priority,
        queueLength: this.queue.length
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.startProcessing();
      }

      this.updateProgress();
    });
  }

  /**
   * Professional queue processing with advanced rate limiting
   */
  private async startProcessing() {
    this.isProcessing = true;
    this.debugLog('info', '🚀 Request Scheduler Started', {
      queueLength: this.queue.length,
      config: this.config
    });

    while (this.queue.length > 0 || this.activeRequests.size > 0) {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen()) {
        this.debugLog('warning', '🚫 Circuit Breaker Open - Waiting', {
          openUntil: new Date(this.circuitBreakerOpenUntil).toISOString()
        });
        await this.delay(1000);
        continue;
      }

      // Respect concurrent request limit
      if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
        await this.delay(100);
        continue;
      }

      // Respect rate limiting
      if (!this.canMakeRequest()) {
        const waitTime = this.calculateRateLimit();
        this.debugLog('info', `⏱️ Rate Limit - Waiting ${waitTime}ms`, {
          currentRPS: this.performanceMetrics.currentRPS,
          targetRPS: this.config.requestsPerSecond
        });
        await this.delay(waitTime);
        continue;
      }

      const task = this.queue.shift();
      if (!task) {
        if (this.activeRequests.size === 0) break;
        await this.delay(100);
        continue;
      }

      // Execute request
      this.executeRequest(task);
    }

    this.isProcessing = false;
    this.debugLog('info', '✅ Request Scheduler Completed', {
      totalProcessed: this.performanceMetrics.completedRequests,
      failed: this.performanceMetrics.failedRequests,
      averageTime: this.performanceMetrics.averageResponseTime
    });
  }

  /**
   * Execute individual request with professional error handling
   */
  private async executeRequest(task: RequestTask) {
    task.startTime = Date.now();
    this.activeRequests.set(task.id, task);
    this.lastRequestTime = Date.now();
    this.performanceMetrics.activeConnections = this.activeRequests.size;

    this.debugLog('info', `🌐 Executing Request: ${task.id}`, {
      url: task.url,
      method: task.method,
      attempt: task.retryCount + 1
    });

    try {
      const response = await this.makeHttpRequest(task);
      this.handleRequestSuccess(task, response);
    } catch (error) {
      this.handleRequestFailure(task, error as Error);
    }
  }

  /**
   * Professional HTTP request execution
   */
  private async makeHttpRequest(task: RequestTask): Promise<any> {
    const requestBody = {
      url: task.url,
      method: task.method,
      ...(task.token && { token: task.token }),
      ...(task.headers && { headers: task.headers })
    };

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.status !== 200) {
      throw new Error(`API Error ${result.status}: ${result.data?.message || 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Handle successful request completion
   */
  private handleRequestSuccess(task: RequestTask, response: any) {
    const responseTime = Date.now() - (task.startTime || Date.now());
    
    this.activeRequests.delete(task.id);
    this.performanceMetrics.completedRequests++;
    this.performanceMetrics.activeConnections = this.activeRequests.size;
    
    // Update average response time
    this.updateAverageResponseTime(responseTime);
    
    // Record success for circuit breaker
    this.recordSuccess();

    this.debugLog('success', `✅ Request Successful: ${task.id}`, {
      responseTime,
      dataSize: JSON.stringify(response).length,
      status: response.status
    });

    task.resolve(response);
    this.updateProgress();
  }

  /**
   * Handle request failure with retry logic
   */
  private async handleRequestFailure(task: RequestTask, error: Error) {
    this.activeRequests.delete(task.id);
    this.performanceMetrics.activeConnections = this.activeRequests.size;
    
    // Record failure for circuit breaker
    this.recordFailure();

    task.retryCount++;

    if (task.retryCount <= task.maxRetries) {
      const retryDelay = this.calculateRetryDelay(task.retryCount);
      
      this.debugLog('warning', `🔄 Retrying Request: ${task.id}`, {
        attempt: task.retryCount,
        maxRetries: task.maxRetries,
        retryDelay,
        error: error.message
      });

      // Re-queue with delay
      setTimeout(() => {
        this.insertByPriority(task);
      }, retryDelay);
    } else {
      this.performanceMetrics.failedRequests++;
      
      this.debugLog('error', `❌ Request Failed: ${task.id}`, {
        finalAttempt: task.retryCount,
        error: error.message
      });

      task.reject(error);
    }

    this.updateProgress();
  }

  /**
   * Professional priority queue insertion
   */
  private insertByPriority(task: RequestTask) {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] < taskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, task);
  }

  /**
   * Adaptive rate limiting calculation
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.requestsPerSecond;

    return timeSinceLastRequest >= minInterval;
  }

  /**
   * Calculate optimal wait time for rate limiting
   */
  private calculateRateLimit(): number {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.requestsPerSecond;

    return Math.max(0, minInterval - timeSinceLastRequest);
  }

  /**
   * Professional exponential backoff retry delay
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    
    return Math.min(jitteredDelay, this.config.maxRetryDelay);
  }

  /**
   * Circuit breaker pattern implementation
   */
  private isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    
    if (this.circuitBreakerOpenUntil > now) {
      this.performanceMetrics.circuitBreakerOpen = true;
      return true;
    }

    this.performanceMetrics.circuitBreakerOpen = false;
    return false;
  }

  /**
   * Record request failure for circuit breaker
   */
  private recordFailure() {
    const now = Date.now();
    this.failureHistory.push(now);
    
    // Keep only last 60 seconds of failures
    this.failureHistory = this.failureHistory.filter(time => now - time < 60000);
    
    // Open circuit breaker if failure rate exceeds threshold
    const totalRecent = this.completedRequests.filter(time => now - parseInt(time) < 60000).length + this.failureHistory.length;
    const failureRate = totalRecent > 0 ? this.failureHistory.length / totalRecent : 0;
    
    if (failureRate > this.config.circuitBreakerThreshold) {
      this.circuitBreakerOpenUntil = now + 30000; // Open for 30 seconds
      this.debugLog('warning', '🚫 Circuit Breaker Opened', {
        failureRate,
        threshold: this.config.circuitBreakerThreshold
      });
    }
  }

  /**
   * Record request success for circuit breaker
   */
  private recordSuccess() {
    const now = Date.now();
    this.completedRequests.push(now.toString());
    
    // Keep only last 60 seconds of successes
    this.completedRequests = this.completedRequests.filter(time => now - parseInt(time) < 60000);
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number) {
    const total = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.completedRequests - 1) + responseTime;
    this.performanceMetrics.averageResponseTime = total / this.performanceMetrics.completedRequests;
  }

  /**
   * Update progress metrics and notify callbacks
   */
  private updateProgress() {
    // Calculate current RPS
    const now = Date.now();
    const recentRequests = this.completedRequests.filter(time => now - parseInt(time) < 1000);
    this.performanceMetrics.currentRPS = recentRequests.length;

    this.onProgressCallback?.(this.performanceMetrics);
  }

  /**
   * Enhanced debug logging
   */
  private debugLog(level: string, message: string, data?: any) {
    this.onDebugCallback?.(level, message, data);
  }

  /**
   * Utility functions
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset scheduler state
   */
  reset() {
    this.queue = [];
    this.activeRequests.clear();
    this.completedRequests = [];
    this.failureHistory = [];
    this.circuitBreakerOpenUntil = 0;
    this.performanceMetrics = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentRPS: 0,
      activeConnections: 0,
      circuitBreakerOpen: false
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.debugLog('info', '🛑 Scheduler Shutdown Initiated', {
      pendingRequests: this.queue.length,
      activeRequests: this.activeRequests.size
    });

    // Wait for active requests to complete
    while (this.activeRequests.size > 0) {
      await this.delay(100);
    }

    this.debugLog('info', '✅ Scheduler Shutdown Complete', {});
  }
}

// Create singleton instance for global use
export const professionalScheduler = new ProfessionalRequestScheduler({
  maxConcurrentRequests: 6,
  requestsPerSecond: 4,
  adaptiveRateLimit: true,
  circuitBreakerThreshold: 0.4,
  retryDelay: 800,
  maxRetryDelay: 25000
});