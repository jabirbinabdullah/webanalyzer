import React, { useState, useEffect, useContext } from 'react';
import {
  getProfile,
  updateProfile,
  getApiKeys,
  generateApiKey,
  deleteApiKey,
} from '../services/api';
import AuthContext from '../context/AuthContext';

export default function Profile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user, setUser } = useContext(AuthContext);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const profile = await getProfile();
        setName(profile.name);
        setEmail(profile.email);
        setEmailNotifications(profile.emailNotifications);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    async function fetchApiKeys() {
      try {
        const apiKeys = await getApiKeys();
        setKeys(apiKeys);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchProfile();
    fetchApiKeys();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const updatedUser = await updateProfile({
        name,
        email,
        emailNotifications,
      });
      setUser(updatedUser);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateKey() {
    try {
      const newKey = await generateApiKey();
      setKeys([...keys, newKey]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteKey(keyId) {
    try {
      await deleteApiKey(keyId);
      setKeys(keys.filter((key) => key._id !== keyId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
            Receive email notifications when analysis is complete
          </label>
        </div>
        <button type="submit" className="btn">
          Save Changes
        </button>
        {success && <div className="success">{success}</div>}
      </form>

      <div className="api-keys-container">
        <h2>API Keys</h2>
        <button onClick={handleGenerateKey} className="btn">
          Generate New Key
        </button>
        <ul className="api-keys-list">
          {keys.map((key) => (
            <li key={key._id} className="api-key-item">
              <span className="api-key-value">{key.key}</span>
              <button
                onClick={() => handleDeleteKey(key._id)}
                className="btn btn-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
