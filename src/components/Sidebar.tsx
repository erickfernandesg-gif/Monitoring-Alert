import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { 
  Activity, 
  History, 
  Bell, 
  LayoutDashboard, 
  Settings, 
  HelpCircle, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const NavContent = () => (
    <>
      <div className="px-6 mb-8 mt-4 md:mt-0">
        <div className="text-xs font-bold text-outline mb-1">CENTRO DE COMANDO</div>
        <div className="text-[10px] text-surface-variant tracking-widest">MONITORAMENTO 24/7</div>
      </div>
      <nav className="flex-1 flex flex-col gap-1">
        <NavLink 
          to="/" 
          onClick={() => setIsOpen(false)}
          className={({ isActive }) => 
            `flex items-center gap-3 px-6 py-3 transition-all active:scale-[0.98] duration-150 ${isActive ? "bg-surface text-primary border-r-2 border-primary" : "text-surface-variant hover:bg-surface hover:text-on-surface"}`
          }
        >
          <LayoutDashboard size={18} />
          Visão Geral
        </NavLink>
        <NavLink 
          to="/admin" 
          onClick={() => setIsOpen(false)}
          className={({ isActive }) => 
            `flex items-center gap-3 px-6 py-3 transition-all active:scale-[0.98] duration-150 ${isActive ? "bg-surface text-primary border-r-2 border-primary" : "text-surface-variant hover:bg-surface hover:text-on-surface"}`
          }
        >
          <Settings size={18} />
          Administração
        </NavLink>
      </nav>
      <div className="mt-auto px-2 flex flex-col gap-1">
        <button className="text-surface-variant flex items-center gap-3 px-4 py-3 hover:bg-surface hover:text-on-surface transition-all active:scale-[0.98] duration-150 rounded-lg">
          <HelpCircle size={18} />
          Suporte
        </button>
        <button className="text-surface-variant flex items-center gap-3 px-4 py-3 hover:bg-surface hover:text-on-surface transition-all active:scale-[0.98] duration-150 rounded-lg">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Navbar */}
      <nav className="md:hidden bg-background fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-6 border-b border-surface-container-high h-14">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="text-surface-variant hover:text-white transition-colors">
            <Menu size={24} />
          </button>
          <div className="text-sm font-black text-white tracking-tighter">HUMANITARIAN OPS</div>
        </div>
        <div className="flex items-center gap-4">
          <Activity className="text-surface-variant hover:text-white transition-colors cursor-pointer active:opacity-70" size={20} />
          <Bell className="text-surface-variant hover:text-white transition-colors cursor-pointer active:opacity-70" size={20} />
        </div>
      </nav>

      {/* Mobile Sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.aside 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden bg-background fixed left-0 top-0 h-screen flex-col pt-16 pb-6 z-50 w-64 border-r border-surface-container-high font-body-base text-[11px] font-medium tracking-wide flex shadow-2xl"
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-surface-variant hover:text-white"
            >
              <X size={24} />
            </button>
            <NavContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (always static on md+) */}
      <aside className="hidden md:flex bg-background fixed left-0 top-0 h-screen flex-col pt-16 pb-6 w-64 border-r border-surface-container-high font-body-base text-[11px] font-medium tracking-wide z-10">
        <NavContent />
      </aside>
    </>
  );
}
