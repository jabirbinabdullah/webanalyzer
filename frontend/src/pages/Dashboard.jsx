import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import { Loader2, Activity, Globe, Zap, Search, Shield } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (err) {
                setError(err.message || 'Failed to load stats');
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center mt-10">{error}</div>;
    }

    if (!stats) return null;

    return (
        <div className="dashboard-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Dashboard</h1>
            <p style={{ color: '#666', marginBottom: '32px' }}>Overview of your analysis portfolio</p>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <StatCard
                    title="Total Analyses"
                    value={stats.overview.total}
                    icon={<Globe size={24} color="#0088FE" />}
                />
                <StatCard
                    title="Avg Performance"
                    value={`${stats.overview.avgPerformance}%`}
                    icon={<Zap size={24} color="#FFBB28" />}
                />
                {/* We can add placeholders for others if API doesn't return them yet */}
                <StatCard
                    title="Avg SEO Score (Est)"
                    value="N/A"
                    icon={<Search size={24} color="#00C49F" />}
                    subtitle="To be implemented"
                />
                <StatCard
                    title="Avg Security"
                    value="N/A"
                    icon={<Shield size={24} color="#FF8042" />}
                    subtitle="To be implemented"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>

                {/* Tech Stack Chart */}
                <div className="card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Top Technologies</h2>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.technology}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {stats.technology.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Performance Trend Chart */}
                <div className="card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Performance Trend (Last 10)</h2>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ title, value, icon, subtitle }) {
    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#f5f7fa', borderRadius: '50%' }}>
                {icon || <Activity size={24} />}
            </div>
            <div>
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>{title}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{value}</p>
                {subtitle && <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>{subtitle}</p>}
            </div>
        </div>
    );
}
