/**
 * 在webview中的交通
 */

class JsBridge {
  constructor() {
    if (process.env.VUE_APP_TARGET === 'client') {
      this.getEnv();
      this.registerReciver();
      this._jsBridgeInit = false;
      this.subscriber = {};
    }
  }
  getEnv() {
    const userAgent = navigator.userAgent.toLowerCase();
    console.log(window.location.href);
    this.env = {
      isInWebview: userAgent.indexOf('edgetech') > -1, // 在webview中
      isIos: /iPhone|iPad|iPod/i.test(userAgent),
      isAndroid: /Android/i.test(userAgent),
      isWechat: /MicroMessenger/i.test(userAgent),
      isMiniprogram: /miniProgram/i.test(userAgent)  // 在小程序
    };
  }
  init() {
    return new Promise((resolve, reject) => {
      if (this.env.isAndroid && this.env.isInWebview && !this.hasInit) {
        // this.androidJsBridge
        if (window.WebViewJavascriptBridge) {
          window.WebViewJavascriptBridge.init((data, callback) => {
            callback('received data');
          });
          this.hasInit = true;
          resolve();
        } else {
          document.addEventListener('WebViewJavascriptBridgeReady', () => {
            if (this.hasInit) return;
            window.WebViewJavascriptBridge.init((data, callback) => {
              callback('received data');
            });
            this.hasInit = true;
            resolve();
          });
        }
      } else {
        resolve();
      }
    });
  }
  // 事件机制
  on(event, callback) {
    if (!this.subscriber[event] || this.subscriber[event].length === 0) {
      this.subscriber[event] = [callback];
    } else {
      this.subscriber[event].push(callback);
    }
  }
  // ios 初始化
  setupIosWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
      return callback(window.WebViewJavascriptBridge);
    }
    if (window.WVJBCallbacks) {
      return window.WVJBCallbacks.push(callback);
    } else {
      window.WVJBCallbacks = [callback];
      let WVJBIframe = document.createElement('iframe');
      WVJBIframe.style.display = 'none';
      WVJBIframe.src = 'wvjbscheme://__BRIDGE_LOADED__';
      document.documentElement.appendChild(WVJBIframe);
      setTimeout(function() { document.documentElement.removeChild(WVJBIframe) }, 0);
    }
  }
  registerReciver() {
    if (this.env.isInWebview && this.env.isAndroid) {
      if (window.WebViewJavascriptBridge) {
        window.WebViewJavascriptBridge.registerHandler('appToWeb', (data, responseCallback) => {
          const dataObj = JSON.parse(data);
          const event = dataObj.type;
          if (this.subscriber[event]) {
            this.subscriber[event].forEach(func => {
              func(dataObj.data, responseCallback);
            });
          }
        });
      } else {
        document.addEventListener('WebViewJavascriptBridgeReady', () => {
          window.WebViewJavascriptBridge.registerHandler('appToWeb', (data, responseCallback) => {
            const dataObj = JSON.parse(data);
            const event = dataObj.type;
            if (this.subscriber[event]) {
              this.subscriber[event].forEach(func => {
                func(dataObj.data, responseCallback);
              });
            }
          });
        });
      }
    } else if (this.env.isInWebview && this.env.isIos) {
      return new Promise((resolve, reject) => {
        try {
          this.setupIosWebViewJavascriptBridge((bridge) => {
            bridge.registerHandler('appToWeb', (data, responseCallback) => {
              const dataObj = JSON.parse(data);
              const event = dataObj.type;
              if (this.subscriber[event]) {
                this.subscriber[event].forEach(func => {
                  func(dataObj.data, responseCallback);
                });
              }
            });
          });
        } catch (error) {
          reject(error);
        }
      });
    }
  }
  postMessage(type, data, callback) {
    if (this.env.isInWebview && this.env.isAndroid) {
      return this.sendToAndroid(type, data, callback);
    } else if (this.env.isIos) {
      return this.sendToIos(type, data, callback);
    } else {
      return Promise.resolve();
    }
  }
  sendToAndroid(type, data) {
    return new Promise((resolve, reject) => {
      try {
        if (window.WebViewJavascriptBridge) {
          if (!this._jsBridgeInit) {
            window.WebViewJavascriptBridge.init();
            this._jsBridgeInit = true;
          }
          window.WebViewJavascriptBridge.callHandler('webToApp', {
            type,
            data: JSON.stringify(data),
          }, function(data) {
            if (data) {
              resolve(JSON.parse(data));
            } else {
              resolve();
            }
          });
        } else {
          document.addEventListener('WebViewJavascriptBridgeReady', () => {
            if (!this._jsBridgeInit) {
              window.WebViewJavascriptBridge.init();
              this._jsBridgeInit = true;
            }
            window.WebViewJavascriptBridge.callHandler('webToApp', {
              type,
              data: JSON.stringify(data),
            }, function(data) {
              if (data) {
                resolve(JSON.parse(data));
              } else {
                resolve();
              }
            });
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  sendToIos(type, data) {
    function setupWebViewJavascriptBridge(callback) {
      if (window.WebViewJavascriptBridge) {
        return callback(window.WebViewJavascriptBridge);
      }
      if (window.WVJBCallbacks) {
        return window.WVJBCallbacks.push(callback);
      } else {
        window.WVJBCallbacks = [callback];
        let WVJBIframe = document.createElement('iframe');
        WVJBIframe.style.display = 'none';
        WVJBIframe.src = 'wvjbscheme://__BRIDGE_LOADED__';
        document.documentElement.appendChild(WVJBIframe);
        setTimeout(function() { document.documentElement.removeChild(WVJBIframe) }, 0);
      }

    }
    return new Promise((resolve, reject) => {
      try {
        setupWebViewJavascriptBridge((bridge) => {
          bridge.callHandler('webToApp', {
            type,
            data: JSON.stringify(data),
          }, function(data) {
            if (data) {
              resolve(JSON.parse(data));
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  handlerResponse(res) {
    //
  }
}

export default new JsBridge();
