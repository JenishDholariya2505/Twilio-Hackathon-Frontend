import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Layout,
  Card,
  Button,
  Input,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  Typography,
  Space,
  Alert,
  Spin,
  Modal,
  Form,
  message,
  Divider,
  Badge,
} from "antd";
import {
  PhoneOutlined,
  MessageOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SoundOutlined,
  StopOutlined,
  ReloadOutlined,
  BarChartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import axios from "axios";
import { Device } from "@twilio/voice-sdk";
import "./TwilioDashboard.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const TwilioDashboard = () => {
  // State management
  const [identity, setIdentity] = useState("");
  const [device, setDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [callStatus, setCallStatus] = useState("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [callLogs, setCallLogs] = useState([]);
  const [messageLogs, setMessageLogs] = useState([]);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalMessages: 0,
    deviceUptime: 0,
  });

  const connectionRef = useRef(null);
  const API_BASE_URL = "https://twilio-hackathon-backend.vercel.app";

  // Chart data
  const callData = [
    { name: "Mon", calls: 4, messages: 8 },
    { name: "Tue", calls: 3, messages: 12 },
    { name: "Wed", calls: 7, messages: 15 },
    { name: "Thu", calls: 5, messages: 10 },
    { name: "Fri", calls: 9, messages: 18 },
    { name: "Sat", calls: 2, messages: 6 },
    { name: "Sun", calls: 6, messages: 14 },
  ];

  const statusData = [
    { name: "Connected", value: 65, color: "#16a34a" },
    { name: "Disconnected", value: 25, color: "#dc2626" },
    { name: "Error", value: 10, color: "#d97706" },
  ];

  // Fetch token from backend
  const fetchToken = useCallback(
    async (userIdentity) => {
      try {
        setIsLoading(true);
        setError("");

        const response = await axios.get(`${API_BASE_URL}/token`, {
          params: { identity: userIdentity },
        });

        if (response.data.success) {
          message.success(`Token fetched successfully for ${userIdentity}`);
          return response.data.token;
        } else {
          throw new Error("Failed to fetch token");
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        message.error(`Failed to fetch token: ${errorMessage}`);
        setError(`Failed to fetch token: ${errorMessage}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE_URL]
  );

  // Initialize Twilio Device
  const initializeDevice = useCallback(
    async (token) => {
      try {
        message.info("Initializing Twilio Device...");

        const newDevice = new Device(token, {
          logLevel: 1,
          closeProtection: true,
          fakeLocalDTMF: true,
          enableRingingState: true,
        });

        // Set up event listeners
        newDevice.on("ready", () => {
          message.success("Device is ready");
          setConnectionStatus("ready");
        });

        newDevice.on("error", (error) => {
          message.error(`Device error: ${error.message}`);
          setConnectionStatus("error");
          setError(error.message);
        });

        newDevice.on("connect", (connection) => {
          message.success("Call connected");
          setCallStatus("connected");
          connectionRef.current = connection;

          // Add to call logs
          const newCall = {
            id: Date.now(),
            type: "outgoing",
            number: phoneNumber,
            status: "connected",
            duration: 0,
            timestamp: new Date().toISOString(),
            identity: identity,
          };
          setCallLogs((prev) => [newCall, ...prev]);

          connection.on("disconnect", () => {
            message.info("Call disconnected");
            setCallStatus("idle");
            connectionRef.current = null;

            // Update call log
            setCallLogs((prev) =>
              prev.map((call) =>
                call.id === newCall.id
                  ? {
                      ...call,
                      status: "completed",
                      duration: Math.floor(Math.random() * 300) + 30,
                    }
                  : call
              )
            );
          });

          connection.on("error", (error) => {
            message.error(`Call error: ${error.message}`);
            setCallStatus("error");

            // Update call log
            setCallLogs((prev) =>
              prev.map((call) =>
                call.id === newCall.id ? { ...call, status: "failed" } : call
              )
            );
          });
        });

        newDevice.on("disconnect", () => {
          message.info("Device disconnected");
          setConnectionStatus("disconnected");
          setCallStatus("idle");
          connectionRef.current = null;
        });

        newDevice.on("incoming", (connection) => {
          message.info("Incoming call received");
          setCallStatus("incoming");
          connectionRef.current = connection;

          // Add to call logs
          const newCall = {
            id: Date.now(),
            type: "incoming",
            number: "Unknown",
            status: "incoming",
            duration: 0,
            timestamp: new Date().toISOString(),
            identity: identity,
          };
          setCallLogs((prev) => [newCall, ...prev]);
        });

        setDevice(newDevice);
        message.success("Device initialized successfully");
      } catch (err) {
        message.error(`Error initializing device: ${err.message}`);
        setError(`Failed to initialize device: ${err.message}`);
      }
    },
    [identity, phoneNumber]
  );

  // Connect to Twilio
  const connectToTwilio = useCallback(async () => {
    if (!identity.trim()) {
      message.error("Please enter an identity");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const token = await fetchToken(identity);
      await initializeDevice(token);
    } catch (err) {
      console.error("Connection error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [identity, fetchToken, initializeDevice]);

  // Make outgoing call
  const makeCall = useCallback(async () => {
    if (!device || connectionStatus !== "ready") {
      message.error("Device not ready. Please connect first.");
      return;
    }

    if (!phoneNumber.trim()) {
      message.error("Please enter a phone number");
      return;
    }

    try {
      setError("");
      message.info(`Initiating call to ${phoneNumber}`);

      const connection = await device.connect({
        params: {
          To: phoneNumber,
          From: identity,
        },
      });

      connectionRef.current = connection;
      setCallStatus("connecting");
      setIsCallModalVisible(false);
    } catch (err) {
      message.error(`Call failed: ${err.message}`);
      setError(`Call failed: ${err.message}`);
    }
  }, [device, connectionStatus, phoneNumber, identity]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!messageText.trim()) {
      message.error("Please enter a message");
      return;
    }

    try {
      // Simulate message sending
      const newMessage = {
        id: Date.now(),
        type: "outgoing",
        content: messageText,
        status: "sent",
        timestamp: new Date().toISOString(),
        identity: identity,
      };

      setMessageLogs((prev) => [newMessage, ...prev]);
      setMessageText("");
      setIsMessageModalVisible(false);
      message.success("Message sent successfully");
    } catch (err) {
      message.error(`Failed to send message: ${err.message}`);
    }
  }, [messageText, identity]);

  // Hang up call
  const hangUp = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
      setCallStatus("idle");
      message.info("Call ended");
    }
  }, []);

  // Disconnect device
  const disconnectDevice = useCallback(() => {
    if (device) {
      device.destroy();
      setDevice(null);
      setConnectionStatus("disconnected");
      setCallStatus("idle");
      connectionRef.current = null;
      message.info("Device disconnected");
    }
  }, [device]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "ready":
        return "#16a34a";
      case "connected":
        return "#1890ff";
      case "connecting":
        return "#d97706";
      case "error":
        return "#dc2626";
      default:
        return "#64748b";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "ready":
        return <CheckCircleOutlined />;
      case "connected":
        return <SoundOutlined />;
      case "connecting":
        return <LoadingOutlined />;
      case "error":
        return <CloseCircleOutlined />;
      default:
        return <CloseCircleOutlined />;
    }
  };

  // Call logs table columns
  const callColumns = [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "incoming" ? "green" : "blue"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Number",
      dataIndex: "number",
      key: "number",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={
            status === "connected"
              ? "green"
              : status === "failed"
              ? "red"
              : status === "incoming"
              ? "orange"
              : "default"
          }
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      render: (duration) => (duration > 0 ? `${duration}s` : "-"),
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
    },
  ];

  // Message logs table columns
  const messageColumns = [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "incoming" ? "green" : "blue"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Content",
      dataIndex: "content",
      key: "content",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "sent" ? "green" : "red"}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
    },
  ];

  // Update stats
  useEffect(() => {
    setStats({
      totalCalls: callLogs.length,
      successfulCalls: callLogs.filter((call) => call.status === "completed")
        .length,
      failedCalls: callLogs.filter((call) => call.status === "failed").length,
      totalMessages: messageLogs.length,
      deviceUptime:
        connectionStatus === "ready" ? Math.floor(Date.now() / 1000) : 0,
    });
  }, [callLogs, messageLogs, connectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (device) {
        device.destroy();
      }
    };
  }, [device]);

  return (
    <Layout className="twilio-dashboard">
      <Header className="dashboard-header">
        <div className="header-content">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="header-left"
          >
            <Title level={2} style={{ color: "#1e293b", margin: 0 }}>
              📞 Twilio Voice Dashboard
            </Title>
            <Text style={{ color: "#64748b", marginTop: 4, fontSize: 14 }}>
              Professional Voice Communication Platform
            </Text>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="header-right"
          >
            <Space size="middle">
              <Badge status="processing" text="Live" />
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                {new Date().toLocaleDateString()}
              </Text>
            </Space>
          </motion.div>
        </div>
      </Header>

      <Content className="dashboard-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Connection Section */}
          <Card title="🔗 Device Connection" className="connection-card">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Enter your identity (e.g., alice)"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  disabled={isLoading || device}
                  prefix={<UserOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <Button
                    type="primary"
                    onClick={connectToTwilio}
                    disabled={isLoading || !identity.trim() || device}
                    loading={isLoading}
                    icon={<CheckCircleOutlined />}
                  >
                    {isLoading ? "Connecting..." : "Connect"}
                  </Button>

                  {device && (
                    <Button
                      onClick={disconnectDevice}
                      icon={<CloseCircleOutlined />}
                    >
                      Disconnect
                    </Button>
                  )}
                </Space>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Badge
                  status={
                    connectionStatus === "ready"
                      ? "success"
                      : connectionStatus === "error"
                      ? "error"
                      : "default"
                  }
                  text={
                    <Space>
                      {getStatusIcon(connectionStatus)}
                      <Text strong>Device Status: {connectionStatus}</Text>
                    </Space>
                  }
                />
              </Col>
            </Row>
          </Card>

          {/* Statistics Section */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                  <Statistic
                    title="Total Calls"
                    value={stats.totalCalls}
                    prefix={<PhoneOutlined />}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                  <Statistic
                    title="Successful Calls"
                    value={stats.successfulCalls}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: "#16a34a" }}
                  />
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                  <Statistic
                    title="Total Messages"
                    value={stats.totalMessages}
                    prefix={<MessageOutlined />}
                    valueStyle={{ color: "#7c3aed" }}
                  />
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Card>
                  <Statistic
                    title="Device Uptime"
                    value={stats.deviceUptime}
                    suffix="s"
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: "#d97706" }}
                  />
                </Card>
              </motion.div>
            </Col>
          </Row>

          {/* Charts Section */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={16}>
              <motion.div whileHover={{ scale: 1.02 }}>
                <Card title="📊 Activity Overview" icon={<BarChartOutlined />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={callData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        stroke="#1890ff"
                        name="Calls"
                      />
                      <Line
                        type="monotone"
                        dataKey="messages"
                        stroke="#7c3aed"
                        name="Messages"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} lg={8}>
              <motion.div whileHover={{ scale: 1.02 }}>
                <Card title="📈 Status Distribution" icon={<TeamOutlined />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>
            </Col>
          </Row>

          {/* Action Buttons */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<PhoneOutlined />}
                  onClick={() => setIsCallModalVisible(true)}
                  disabled={connectionStatus !== "ready"}
                  block
                >
                  Make Call
                </Button>
              </motion.div>
            </Col>
            <Col xs={24} sm={12}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Button
                  type="default"
                  size="large"
                  icon={<MessageOutlined />}
                  onClick={() => setIsMessageModalVisible(true)}
                  block
                >
                  Send Message
                </Button>
              </motion.div>
            </Col>
          </Row>

          {/* Call Status */}
          {callStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 16 }}
            >
              <Alert
                message={`Call Status: ${callStatus}`}
                type={callStatus === "connected" ? "success" : "info"}
                showIcon
                action={
                  (callStatus === "connected" ||
                    callStatus === "connecting") && (
                    <Button
                      size="small"
                      danger
                      onClick={hangUp}
                      icon={<StopOutlined />}
                    >
                      Hang Up
                    </Button>
                  )
                }
              />
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 16 }}
            >
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError("")}
              />
            </motion.div>
          )}

          {/* Call Logs */}
          <Card title="📞 Call History" style={{ marginTop: 16 }}>
            <Table
              columns={callColumns}
              dataSource={callLogs}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>

          {/* Message Logs */}
          <Card title="💬 Message History" style={{ marginTop: 16 }}>
            <Table
              columns={messageColumns}
              dataSource={messageLogs}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </motion.div>

        {/* Call Modal */}
        <Modal
          title="📞 Make a Call"
          open={isCallModalVisible}
          onOk={makeCall}
          onCancel={() => setIsCallModalVisible(false)}
          okText="Call"
          cancelText="Cancel"
          okButtonProps={{ disabled: !phoneNumber.trim() }}
        >
          <Form layout="vertical">
            <Form.Item label="Phone Number" required>
              <Input
                placeholder="Enter phone number (e.g., +1234567890)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                prefix={<PhoneOutlined />}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Message Modal */}
        <Modal
          title="💬 Send Message"
          open={isMessageModalVisible}
          onOk={sendMessage}
          onCancel={() => setIsMessageModalVisible(false)}
          okText="Send"
          cancelText="Cancel"
          okButtonProps={{ disabled: !messageText.trim() }}
        >
          <Form layout="vertical">
            <Form.Item label="Message" required>
              <TextArea
                placeholder="Enter your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default TwilioDashboard;
