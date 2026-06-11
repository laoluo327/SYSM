import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Drawer } from 'antd';
import {
  DashboardOutlined, SettingOutlined, UserOutlined, ShopOutlined,
  TeamOutlined, ShoppingOutlined, ImportOutlined, ExportOutlined,
  DollarOutlined, DatabaseOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

const { Sider, Header, Content, Footer } = Layout;

const MOBILE_BREAKPOINT = 768;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sysName, setSysName] = useState('做账管理系统');
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 监听窗口大小变化
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
    if (user.role !== 'admin') {
      navigate('/user');
      return;
    }
    loadSettings();
  }, []);

  // 路由切换时自动关闭抽屉
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const loadSettings = async () => {
    const res = await api.get('/settings');
    if (res.code === 0 && res.data?.system_name) {
      setSysName(res.data.system_name);
      document.title = res.data.system_name;
    }
  };

  const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: '首页工作台' },
    { key: '/admin/settings', icon: <SettingOutlined />, label: '系统设置' },
    { key: '/admin/users', icon: <UserOutlined />, label: '账号管理' },
    { key: '/admin/companies', icon: <ShopOutlined />, label: '商品公司' },
    { key: '/admin/clients', icon: <TeamOutlined />, label: '客户单位' },
    { key: '/admin/products', icon: <ShoppingOutlined />, label: '商品列表' },
    { key: '/admin/stock-in', icon: <ImportOutlined />, label: '商品入库' },
    { key: '/admin/stock-out', icon: <ExportOutlined />, label: '商品出库' },
    { key: '/admin/expenses', icon: <DollarOutlined />, label: '日常开销' },
    { key: '/admin/data-center', icon: <DatabaseOutlined />, label: '数据中心' },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

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

  // 侧边栏菜单（复用于 Sider 和 Drawer）
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
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ border: 'none', padding: '8px 0' }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端：传统侧边栏 */}
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

      {/* 移动端：抽屉式侧边栏 */}
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
            <Dropdown menu={dropdownItems} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar style={{ backgroundColor: '#47B881' }} icon={<UserOutlined />} />
                <span>{user.real_name || user.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="layout-content">
          <Outlet context={{ sysName, refreshSettings: loadSettings }} />
        </Content>
        <Footer className="layout-footer">系统开发：罗工 13896294207</Footer>
      </Layout>
    </Layout>
  );
}
