"use client";
import { useAccount } from "wagmi";
import MainLayout from "@/components/layouts/MainLayout";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const { address } = useAccount();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
              repulsion: 1000,
              edgeLength: 300,
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
        `http://localhost:4000/search?userId=X1L2QMdDesYN2iWzy0Gu0mmskjY2&query=${encodeURIComponent(
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

  useEffect(() => {
    const fetchAndRenderGraph = async () => {
      try {
        const response = await axios.get(
          "http://localhost:4000/graph?userId=X1L2QMdDesYN2iWzy0Gu0mmskjY2"
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

    fetchAndRenderGraph();
  }, []);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

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
        {address ? (
          <>
            <div className="mb-8">{`Hello World, ${address}`}</div>
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
                  placeholder="Ask me anything about your connections..."
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
          </>
        ) : (
          <div className="text-2xl">Connect your wallet to get started</div>
        )}
      </div>
    </MainLayout>
  );
}
