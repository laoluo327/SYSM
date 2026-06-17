import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Drawer, Tag } from 'antd';
import {
  DashboardOutlined, ShoppingCartOutlined, LockOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, BankOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

const { Sider, Header, Content, Footer } = Layout;
const MOBILE_BREAKPOINT = 768;

export default function ClientLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sysName, setSysName] = useState('做账管理系统');
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const clientName = user.client_name || '';

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user.role !== 'client') {
      const rolePath = { admin: '/admin', user: '/user' };
      navigate(rolePath[user.role] || '/login');
      return;
    }
    loadSettings();
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const loadSettings = async () => {
    const res = await api.get('/settings');
    if (res.code === 0 && res.data?.system_name) {
      setSysName(res.data.system_name);
      document.title = res.data.system_name;
    }
  };

  const menuItems = [
    { key: '/client', icon: <DashboardOutlined />, label: '采购首页' },
    { key: '/client/purchase', icon: <ShoppingCartOutlined />, label: '采购申请' },
    { key: '/client/password', icon: <LockOutlined />, label: '修改密码' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const dropdownItems = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '退出系统', onClick: handleLogout },
    ],
  };

  const sideMenu = (
    <>
      <div style={{
        padding: '20px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #F0F0F0'
      }}>
        <div style={{
          fontSize: (collapsed && !isMobile) ? 14 : 18,
          fontWeight: 700,
          color: '#47B881',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {(collapsed && !isMobile) ? sysName.substring(0, 2) : sysName}
        </div>
        {clientName && !(collapsed && !isMobile) && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
            <BankOutlined style={{ marginRight: 4 }} />{clientName}
          </div>
        )}
        {clientName && (collapsed && !isMobile) && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clientName.substring(0, 2)}
          </div>
        )}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ border: 'none', padding: '8px 0' }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={220}
          className="layout-sider"
          style={{ background: '#FFF' }}
        >
          {sideMenu}
        </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={260}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          {sideMenu}
        </Drawer>
      )}
      <Layout>
        <Header className="layout-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
            />
            <span className="header-title">{sysName}</span>
          </div>
          <div className="header-user">
            {isMobile ? (
              <Button
                type="text"
                icon={<LogoutOutlined style={{ fontSize: 18, color: '#47B881' }} />}
                onClick={handleLogout}
                title="退出系统"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#47B881', fontWeight: 500 }}
              >退出</Button>
            ) : (
              <Dropdown menu={dropdownItems} placement="bottomRight">
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar style={{ backgroundColor: '#fa8c16' }} icon={<UserOutlined />} />
                  <span className="user-name">
                    {user.real_name || user.username}
                    {clientName && <Tag color="orange" style={{ marginLeft: 6, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{clientName}</Tag>}
                  </span>
                </div>
              </Dropdown>
            )}
          </div>
        </Header>
        <Content className="layout-content">
          <Outlet />
        </Content>
        <Footer className="layout-footer">系统开发：罗工 13896294207</Footer>
      </Layout>
    </Layout>
  );
}
