import { io, Socket } from "socket.io-client";

import { webpageMessenger } from "@/content-script/main-world/webpage-messenger";
import { Nullable } from "@/types/utils.types";
import { mainWorldExec } from "@/utils/hof";
import UiUtils from "@/utils/UiUtils";
import { parseUrl } from "@/utils/utils";

class WsHook {
  private static instance: WsHook | null = null;
  private capturedInstances: Set<Nullable<WebSocket | XMLHttpRequest>> =
    new Set();
  private webSocketInstance: Nullable<WebSocket>;
  private longPollingInstance: Nullable<XMLHttpRequest>;

  private webSocketOriginalSend = WebSocket.prototype.send;

  private constructor() {
    this.webSocketInstance = null;
    this.longPollingInstance = null;
  }

  static getInstance(): WsHook {
    if (!WsHook.instance) {
      WsHook.instance = new WsHook();
    }
    return WsHook.instance;
  }

  initialize(): void {
    let isXMLHttpRequestProxied = false;

    if (!parseUrl().queryParams.has("q")) {
      this.proxyXMLHttpRequest();
      isXMLHttpRequestProxied = true;
    }

    setTimeout(() => {
      if (!this.getActiveInstance() && !isXMLHttpRequestProxied) {
        console.log(
          "No active WebSocket connection found. Falling back to long polling...",
        );
        this.proxyXMLHttpRequest();
        UiUtils.getProSearchToggle().trigger("click");
      }
    }, 5000);

    this.passivelyCaptureWebSocket();

    webpageMessenger.onMessage("getActiveWebSocketType", async () => {
      return this.getActiveInstanceType();
    });
  }

  getWebSocketInstance(): Nullable<WebSocket> {
    return this.webSocketInstance;
  }

  setWebSocketInstance(instance: WebSocket): void {
    if (!this.isValidWebSocketInstance(instance)) return;

    this.capturedInstances.add(instance);

    this.webSocketInstance = instance;
    this.proxyWebSocketInstance(instance);

    window.capturedSocket = this.getActiveInstance();
  }

  isValidWebSocketInstance(instance: WebSocket): boolean {
    return instance?.readyState === 1;
  }

  getLongPollingInstance(): Nullable<XMLHttpRequest> {
    return this.longPollingInstance;
  }

  setLongPollingInstance(instance: XMLHttpRequest): void {
    const url = instance.responseURL;

    if (!url.includes("transport=polling")) return;

    this.longPollingInstance = instance;

    window.capturedSocket = this.getActiveInstance();
    window.longPollingInstance = this.getLongPollingInstance();
  }

  getActiveInstance(): Nullable<WebSocket | XMLHttpRequest> {
    if (this.webSocketInstance && this.webSocketInstance.readyState === 1) {
      return this.getWebSocketInstance();
    }

    if (this.longPollingInstance) {
      return this.getLongPollingInstance();
    }

    return null;
  }

  getActiveInstanceType(): Nullable<"WebSocket" | "Long-polling"> {
    if (this.getActiveInstance() instanceof WebSocket) {
      return "WebSocket";
    }

    if (this.getActiveInstance() instanceof XMLHttpRequest) {
      return "Long-polling";
    }

    return null;
  }

  async sendWebSocketMessage(
    data: any,
    forceLongPolling: boolean,
  ): Promise<void | Response> {
    const instance = this.getActiveInstance();

    if (!instance) {
      alert("No active WebSocket connection found!");
      return;
    }

    if (instance instanceof WebSocket) {
      if (forceLongPolling && instance.url.includes("sid")) {
        const url = instance.url
          .replace("wss://", "https://")
          .replace('transport="websocket"', 'transport="polling"');
        return sendLongPollingRequest(url, data);
      } else {
        instance.send(data);
        return;
      }
    }

    if (
      instance instanceof XMLHttpRequest &&
      instance.responseURL.includes("sid")
    ) {
      const url = instance.responseURL;
      if (url) {
        return sendLongPollingRequest(url, data);
      }
    }

    async function sendLongPollingRequest(
      url: string,
      data: any,
    ): Promise<Response> {
      const newData = await webpageMessenger.sendMessage({
        event: "longPollingEvent",
        payload: { event: "request", payload: data },
        timeout: 1000,
      });

      return fetch(url, {
        method: "POST",
        body: newData,
      });
    }
  }

  onWebSocketMessage({
    startCondition,
    stopCondition,
    callback,
  }: {
    startCondition: (message: MessageEvent["data"]) => boolean;
    stopCondition: (message: MessageEvent["data"]) => boolean;
    callback: (data: any) => void;
  }): Nullable<() => void> {
    const instance = this.getActiveInstance();

    if (!instance) return null;

    const stopListening = () => {
      if (instance instanceof WebSocket) {
        instance.removeEventListener(
          "message",
          webSocketMessageHandler as EventListenerOrEventListenerObject,
        );
      } else if (instance instanceof XMLHttpRequest) {
        instance.removeEventListener(
          "readystatechange",
          longPollingMessageHandler,
        );
      }
    };

    const webSocketMessageHandler = (event: MessageEvent) => {
      if (startCondition(event.data)) {
        callback(event.data);
      }

      if (stopCondition(event.data)) {
        stopListening();
      }
    };

    const longPollingMessageHandler = () => {
      if (!(instance instanceof XMLHttpRequest)) return;

      if (instance.readyState === 4) {
        callback(instance.responseText);
      }

      if (stopCondition(instance.responseText)) {
        stopListening();
      }
    };

    if (instance instanceof WebSocket) {
      instance.addEventListener(
        "message",
        webSocketMessageHandler as EventListenerOrEventListenerObject,
      );
    } else if (instance instanceof XMLHttpRequest) {
      instance.addEventListener("readystatechange", longPollingMessageHandler);
    }

    return stopListening;
  }

  proxyWebSocketInstance(instance: WebSocket): void {
    // "onopen"
    const originalOpen = instance.onopen;
    instance.onopen = (event: Event) => {
      webpageMessenger.sendMessage({
        event: "webSocketEvent",
        payload: { event: "open", payload: event },
      });
      if (originalOpen) originalOpen.call(instance, event);
    };

    // "onmessage"
    const originalMessage = instance.onmessage;
    instance.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      webpageMessenger.sendMessage({
        event: "webSocketEvent",
        payload: { event: "message", payload: event.data },
      });

      if (originalMessage) originalMessage.call(instance, event);
    };

    // "onclose"
    const originalClose = instance.onclose;
    instance.onclose = (event: CloseEvent) => {
      webpageMessenger.sendMessage({
        event: "webSocketEvent",
        payload: { event: "close", payload: "closed" },
      });
      if (originalClose) originalClose.call(instance, event);
      this.passivelyCaptureWebSocket();
    };

    // "send" method
    const originalSend = instance.send;
    instance.send = async (data: any) => {
      const modifiedData = await webpageMessenger.sendMessage({
        event: "webSocketEvent",
        payload: { event: "send", payload: data },
        timeout: 5000,
      });

      if (typeof modifiedData !== "string") return;

      originalSend.call(instance, modifiedData);
    };
  }

  proxyXMLHttpRequest() {
    const self = this;

    const originalXMLHttpRequestOpen = XMLHttpRequest.prototype.open;
    const originalXMLHttpRequestSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string,
      async?: boolean,
      user?: string | null,
      password?: string | null,
    ) {
      this.addEventListener(
        "readystatechange",
        function () {
          if (this.readyState === 4) {
            self.setLongPollingInstance(this);

            try {
              const messages = this.responseText.split("");

              if (!Array.isArray(messages)) return;

              for (const message of messages) {
                webpageMessenger.sendMessage({
                  event: "longPollingEvent",
                  payload: { event: "response", payload: message },
                });
              }
            } catch {
              return;
            }
          }
        },
        false,
      );

      originalXMLHttpRequestOpen.call(
        this,
        method,
        url,
        async!,
        user,
        password,
      );
    };

    XMLHttpRequest.prototype.send = async function (data?: string | null) {
      self.setLongPollingInstance(this);

      let newData: string = "";

      try {
        const messages = data?.split("");

        if (!Array.isArray(messages)) throw new Error("Invalid data format");

        for (const message of messages) {
          newData +=
            ((await webpageMessenger.sendMessage({
              event: "longPollingEvent",
              payload: { event: "request", payload: message },
              timeout: 1000,
            })) ?? "") + "";

          while (newData.endsWith("")) {
            newData = newData.slice(0, -1);
          }
        }
      } catch (e) {
        newData = data || "";
      } finally {
        originalXMLHttpRequestSend.call(this, newData);
      }
    };
  }

  passivelyCaptureWebSocket(): void {
    const self = this;

    WebSocket.prototype.send = function (data: any): void {
      if (!this.url.includes("src=cplx") && !self.capturedInstances.has(this)) {
        //! important: must restore the original send method BEFORE capturing the instance
        // WebSocket.prototype.send = self.webSocketOriginalSend;

        self.setWebSocketInstance(this);
        webpageMessenger.sendMessage({
          event: "webSocketEvent",
          payload: { event: "send", payload: data },
        });
      }

      // @ts-expect-error
      return self.webSocketOriginalSend.apply(this, arguments);
    };
  }
}

class InternalWsInstance {
  private static instance: InternalWsInstance | null = null;
  private socket: Socket["io"]["engine"] | null;
  isReady: boolean = false;

  private constructor() {
    this.socket = null;
  }

  static async getInstance(): Promise<InternalWsInstance> {
    if (!InternalWsInstance.instance) {
      InternalWsInstance.instance = new InternalWsInstance();
      InternalWsInstance.instance.socket =
        await InternalWsInstance.instance.handShake();
    }
    return InternalWsInstance.instance;
  }

  private handShake(): Promise<Socket["io"]["engine"] | null> {
    return new Promise((resolve, reject) => {
      try {
        const socket = io("www.perplexity.ai/?src=cplx", {
          transports: ["polling", "websocket"],
          upgrade: true,
          reconnection: false,
        }).io.engine;

        socket.on("message", (message: unknown) => {
          if (typeof message === "string" && message.includes(`0{"sid":"`)) {
            this.isReady = true;
            return resolve(socket);
          }

          webpageMessenger.sendMessage({
            event: "webSocketEvent",
            payload: {
              event: "message",
              payload: "4" + message,
              isInternal: true,
            },
          });
        });
      } catch (error) {
        console.error("Error creating socket:", error);
        reject(error);
        return null;
      }
    });
  }

  getSocket(): Socket["io"]["engine"] | null {
    return this.socket;
  }

  sendMessage(message: any) {
    if (!this.socket) return;

    this.socket.write(message);

    webpageMessenger.sendMessage({
      event: "webSocketEvent",
      payload: { event: "send", payload: message },
    });
  }

  async restartInstance(): Promise<void> {
    this.socket?.close();
    this.isReady = false;
    this.socket = await this.handShake();
  }
}

mainWorldExec(async () => {
  const wsInstance = WsHook.getInstance();
  wsInstance.initialize();

  const ownWsInstance = await InternalWsInstance.getInstance();

  webpageMessenger.onMessage("sendWebSocketMessage", async (data) => {
    if (ownWsInstance.getSocket()?.readyState === "open") {
      ownWsInstance.sendMessage(data.payload.slice(1)); // trim the message prefix
    } else {
      WsHook.getInstance().sendWebSocketMessage(data.payload, false);
    }
  });

  webpageMessenger.onMessage("isWebSocketCaptured", async () => {
    return (
      wsInstance.getWebSocketInstance()?.readyState === 1 ||
      wsInstance.getLongPollingInstance()?.responseURL != null
    );
  });

  webpageMessenger.onMessage("isInternalWebSocketInitialized", async () => {
    return ownWsInstance.isReady;
  });
})();
