"use client";
import MainLayout from "@/components/layouts/MainLayout";
import axios from "axios";
import { use, useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        init: () => void;
        ready: () => void;
        expand: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
          };
          hash?: string;
        };
        onEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [telegramState, setTelegramState] = useState({
    isAvailable: false,
    userId: null as number | null,
    error: null as string | null,
  });

  useEffect(() => {
    const initTelegram = async () => {
      try {
        // Wait for window to be defined
        if (typeof window === "undefined") {
          setTelegramState((prev) => ({
            ...prev,
            error: "Window not defined",
          }));
          return;
        }

        // Check if Telegram WebApp is available
        if (!window.Telegram?.WebApp) {
          setTelegramState((prev) => ({
            ...prev,
            error: "Telegram WebApp not available",
          }));
          return;
        }

        // Initialize WebApp
        const tg = window.Telegram.WebApp;

        // Initialize WebApp first
        try {
          tg.init();
        } catch (initError) {
          console.log("Init error (non-fatal):", initError);
        }

        // Add a small delay to ensure initialization
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Set ready state
        try {
          tg.ready();
        } catch (readyError) {
          console.log("Ready error (non-fatal):", readyError);
        }

        // Expand the WebApp
        try {
          tg.expand();
        } catch (expandError) {
          console.log("Expand error (non-fatal):", expandError);
        }

        // Log the entire WebApp object for debugging
        console.log("Telegram WebApp:", tg);
        console.log("InitDataUnsafe:", tg.initDataUnsafe);

        // Check if we have user data
        const user = tg.initDataUnsafe?.user;
        if (!user?.id) {
          setTelegramState((prev) => ({
            ...prev,
            error: "No user ID in Telegram data",
          }));
          return;
        }

        // Update Telegram state
        setTelegramState({
          isAvailable: true,
          userId: user.id,
          error: null,
        });

        // Try to get our user ID
        try {
          const response = await axios.get(
            `/api/proxy/telegram-user/${user.id}`
          );
          console.log("Backend response:", response.data);

          if (response.data.success) {
            setUserId(response.data.userId);
            fetchAndRenderGraph();
          } else {
            setTelegramState((prev) => ({
              ...prev,
              error: `Backend error: ${response.data.error}`,
            }));
          }
        } catch (error) {
          setTelegramState((prev) => ({
            ...prev,
            error: `API error: ${error}`,
          }));
          console.error("API error:", error);
        }
      } catch (error) {
        setTelegramState((prev) => ({
          ...prev,
          error: `Initialization error: ${error}`,
        }));
        console.error("Telegram init error:", error);
      }
    };

    // Add a small delay before initialization
    setTimeout(initTelegram, 1000);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderGraph = (nodes: any[], edges: any[]) => {
    if (chartRef.current) {
      // Dispose of existing chart instance
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }

      // Create new chart instance
      chartInstance.current = echarts.init(chartRef.current);

      // Ensure unique IDs for nodes
      const uniqueNodes = nodes.reduce((acc: any[], node: any) => {
        if (!acc.find((n: any) => n.id === node.id)) {
          acc.push(node);
        }
        return acc;
      }, []);

      const option = {
        backgroundColor: "#111",
        series: [
          {
            type: "graph",
            roam: true,
            draggable: true,
            zoom: 1,
            layoutAnimation: true,
            cursor: "move",
            layout: "force",
            data: uniqueNodes.map((node) => ({
              id: node.id,
              name: node.label,
              value: node.id,
              fixed: false,
              draggable: true,
              itemStyle: {
                color: getNodeColor(node.type),
                borderColor: "#fff",
                borderWidth: 2,
                shadowColor: getNodeColor(node.type),
                shadowBlur: 20,
              },
              label: {
                show: true,
                color: "#fff",
                fontSize: 14,
                position: "bottom",
                distance: 5,
                formatter: "{b}",
                backgroundColor: "#00000066",
                padding: [4, 8],
                borderRadius: 4,
              },
            })),
            links: edges.map((edge) => ({
              source: edge.source,
              target: edge.target,
              lineStyle: {
                color: "#ffffff50",
                width: 2,
                shadowColor: "#fff",
                shadowBlur: 10,
              },
              label: {
                fontSize: 14,
                show: true,
                color: "#fff",
                formatter: edge.label,
              },
            })),
            force: {
              repulsion: 700,
              edgeLength: 200,
              friction: 0.6,
              gravity: 0.1,
              layoutAnimation: true,
              initLayout: "force",
            },
            emphasis: {
              focus: "adjacency",
              lineStyle: {
                width: 5,
              },
            },
          },
        ],
      };

      chartInstance.current.setOption(option);

      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener("resize", handleResize);

      // Cleanup function for useEffect
      return () => {
        window.removeEventListener("resize", handleResize);
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    try {
      const response = await axios.get(
        `https://omiverse-gem1.onrender.com/search?userId=${userId}&query=${encodeURIComponent(
          query
        )}`
      );

      const { answer, graphData } = response.data;

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);

      if (graphData) {
        console.log(graphData.nodes, graphData.edges);
        renderGraph(graphData.nodes, graphData.edges);
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error while processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };
  const fetchAndRenderGraph = async () => {
    if (!userId) return;

    try {
      const response = await axios.get(
        `https://omiverse-gem1.onrender.com/graph?userId=${userId}`
      );
      const { nodes, edges } = response.data as {
        nodes: {
          id: string;
          label: string;
          type: "PERSON" | "THING" | "EVENT" | "OTHER";
        }[];
        edges: {
          source: string;
          target: string;
          label: string;
        }[];
      };

      console.log(nodes, edges);
      renderGraph(nodes, edges);
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  useEffect(() => {
    fetchAndRenderGraph();
  }, [userId]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [userId]);

  const getNodeColor = (type: string) => {
    const colors = {
      PERSON: "#ff4e50",
      THING: "#00ff9f",
      EVENT: "#4b0082",
      OTHER: "#00ffff",
    };
    return colors[type as keyof typeof colors] || colors.OTHER;
  };

  return (
    <MainLayout>
      <div className="text-center">
        <div
          ref={chartRef}
          className="w-full h-[600px] rounded-lg border border-gray-800"
        />
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="bg-gray-800 rounded-lg mb-4 p-4 h-[300px] overflow-y-auto text-left">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user" ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
