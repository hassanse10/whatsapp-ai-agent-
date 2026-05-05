import React, { useState, useEffect, useCallback } from 'react';
import { agentAPI } from '../services/api';
import FormInput from '../components/FormInput';
import useSSE from '../hooks/useSSE';
import './AgentConfig.css';

const languageOptions = [
  { value: 'darija',  label: 'Darija (Moroccan Arabic)' },
  { value: 'english', label: 'English' },
  { value: 'french',  label: 'French' },
  { value: 'arabic',  label: 'Modern Standard Arabic' },
];
const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly',     label: 'Friendly' },
  { value: 'casual',       label: 'Casual' },
];
const styleOptions = [
  { value: 'concise',  label: 'Concise (Short answers)' },
  { value: 'detailed', label: 'Detailed (Long answers)' },
  { value: 'humorous', label: 'Humorous (With humor)' },
];

const STATUS_LABELS = {
  connected:     { label: 'Connected',     color: '#25D366' },
  scanning:      { label: 'Scan QR Code',  color: '#f0a500' },
  pending:       { label: 'Starting…',     color: '#f0a500' },
  authenticated: { label: 'Authenticated', color: '#25D366' },
  disconnected:  { label: 'Disconnected',  color: '#e74c3c' },
};

export default function AgentConfig() {
  const [agent, setAgent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const [qrCode, setQrCode]         = useState(null);
  const [qrStatus, setQrStatus]     = useState('disconnected');
  const [qrLoading, setQrLoading]   = useState(false);

  const [formData, setFormData] = useState({
    agentName: '',
    language: 'darija',
    tone: 'professional',
    responseStyle: 'concise',
    systemPromptOverride: '',
  });

  // Real-time status and QR updates via SSE
  useSSE((event) => {
    if (event.type !== 'whatsapp_status') return;
    setQrStatus(event.status);
    if (event.qrCode) {
      setQrCode(event.qrCode);
    }
    if (event.status === 'connected') {
      setQrCode(null);
    }
  });

  useEffect(() => { fetchAgentConfig(); }, []);

  const fetchAgentConfig = async () => {
    try {
      setLoading(true);
      const res = await agentAPI.getConfig();
      const agentData = res.data.agent;
      setAgent(agentData);
      setQrStatus(agentData.whatsapp_status || 'disconnected');
      setFormData({
        agentName:            agentData.agent_name || '',
        language:             agentData.language || 'darija',
        tone:                 agentData.tone || 'professional',
        responseStyle:        agentData.response_style || 'concise',
        systemPromptOverride: agentData.system_prompt_override || '',
      });
    } catch (err) {
      setError('Failed to load agent configuration');
    } finally {
      setLoading(false);
    }
  };

  // Poll the QR endpoint once — SSE delivers subsequent updates
  const fetchQRCode = useCallback(async () => {
    if (!agent?.id) return;
    try {
      setQrLoading(true);
      const res = await agentAPI.getQRCode(agent.id);
      setQrStatus(res.data.status);
      if (res.data.qrCode) setQrCode(res.data.qrCode);
    } catch (err) {
      setQrStatus('disconnected');
    } finally {
      setQrLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    if (agent?.id) fetchQRCode();
  }, [agent?.id, fetchQRCode]);

  const handleConnect = async () => {
    if (!agent?.id) return;
    try {
      setQrLoading(true);
      setQrStatus('pending');
      await agentAPI.connectAgent(agent.id);
      // QR / status updates arrive via SSE
    } catch (err) {
      setError('Failed to start WhatsApp session');
      setQrStatus('disconnected');
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!agent?.id) return;
    try {
      await agentAPI.disconnectAgent(agent.id);
      setQrStatus('disconnected');
      setQrCode(null);
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!agent?.id) { setError('Agent ID not found'); return; }
    setSaving(true);
    try {
      await agentAPI.updateConfig(agent.id, formData);
      setSuccess('Agent configuration updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update agent configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const statusInfo = STATUS_LABELS[qrStatus] || STATUS_LABELS.disconnected;

  return (
    <div className="agent-config">
      <div className="page-header">
        <h1 className="page-title">Configure Your AI Agent</h1>
        <p className="page-subtitle">Customize how your agent responds to customers</p>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="config-container">
        {/* Settings form */}
        <div className="config-card">
          <h2>Agent Settings</h2>
          <form onSubmit={handleSubmit}>
            <FormInput label="Agent Name" type="text" name="agentName"
              value={formData.agentName} onChange={handleChange}
              placeholder="e.g., My E-commerce Agent" />
            <FormInput label="Language" type="select" name="language"
              value={formData.language} onChange={handleChange} options={languageOptions} />
            <FormInput label="Conversation Tone" type="select" name="tone"
              value={formData.tone} onChange={handleChange} options={toneOptions} />
            <FormInput label="Response Style" type="select" name="responseStyle"
              value={formData.responseStyle} onChange={handleChange} options={styleOptions} />
            <FormInput label="Custom System Prompt (Optional)" type="textarea"
              name="systemPromptOverride" value={formData.systemPromptOverride}
              onChange={handleChange}
              placeholder="Enter a custom system prompt to override the default behavior..." />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>
          </form>
        </div>

        {/* Preview */}
        <div className="preview-card">
          <h2>Preview</h2>
          <div className="preview-info">
            <p><strong>Language:</strong> {languageOptions.find(o => o.value === formData.language)?.label}</p>
            <p><strong>Tone:</strong> {toneOptions.find(o => o.value === formData.tone)?.label}</p>
            <p><strong>Response Style:</strong> {styleOptions.find(o => o.value === formData.responseStyle)?.label}</p>
          </div>
          <h3>Sample Response</h3>
          <div className="preview-response">
            <p>{formData.language === 'darija' ? 'مرحبا! تاقدر نساعدك فشي حاجة؟' : 'Hello! How can I help you today?'}</p>
          </div>

          {/* Live WhatsApp status badge */}
          <div className="whatsapp-status">
            <h3>WhatsApp Status</h3>
            <span className="status-badge" style={{ backgroundColor: statusInfo.color, color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>
              {statusInfo.label}
            </span>
            {agent?.whatsapp_phone_number && <p style={{ marginTop: 8 }}>Phone: {agent.whatsapp_phone_number}</p>}
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="qr-section">
        <div className="qr-card">
          <h2>Link WhatsApp Account</h2>
          <p className="qr-instructions">
            Scan this QR code with WhatsApp on your phone to activate your dedicated agent.
          </p>

          {qrStatus === 'connected' || qrStatus === 'authenticated' ? (
            <div className="qr-connected">
              <div className="status-icon">✅</div>
              <h3>WhatsApp Connected!</h3>
              <p>Your agent is live and receiving messages.</p>
              <button type="button" onClick={handleDisconnect} className="btn btn-secondary" style={{ marginTop: 12 }}>
                Disconnect
              </button>
            </div>
          ) : qrStatus === 'pending' || qrLoading ? (
            <div className="qr-placeholder">
              <div className="spinner"></div>
              <p>Starting WhatsApp session…</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                The QR code will appear automatically once ready.
              </p>
            </div>
          ) : qrStatus === 'scanning' && qrCode ? (
            <div className="qr-display">
              <img src={qrCode} alt="WhatsApp QR Code" className="qr-image" />
              <div className="qr-instructions-detail">
                <ol>
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to <strong>Settings → Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong></li>
                  <li>Point your phone at this QR code</li>
                </ol>
              </div>
              <button type="button" onClick={fetchQRCode} className="btn btn-secondary" disabled={qrLoading}>
                Refresh QR Code
              </button>
            </div>
          ) : (
            <div className="qr-error">
              <p>Your WhatsApp agent is not connected.</p>
              <button type="button" onClick={handleConnect} className="btn btn-primary" disabled={qrLoading} style={{ marginTop: 12 }}>
                {qrLoading ? 'Starting…' : 'Connect WhatsApp'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
