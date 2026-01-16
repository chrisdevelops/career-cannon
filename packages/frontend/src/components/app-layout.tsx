import type { ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';
import { GlobalSidebar } from './layout/global-sidebar';
import { SectionSidebar } from './layout/section-sidebar';
import { getActiveSection, SUB_NAV, SECTIONS } from '@/lib/navigation';

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);
  const subItems = SUB_NAV[activeSection];
  const hasSecondarySidebar = subItems.length > 0;
  
  // Find the label for the current section to pass to SectionSidebar
  const activeSectionConfig = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <div className="hidden md:flex">
        <GlobalSidebar activeSection={activeSection} />
      </div>
      
      {hasSecondarySidebar && (
        <div className="hidden md:flex">
          <SectionSidebar 
            title={activeSectionConfig?.label || 'Menu'} 
            items={subItems} 
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-background/50">
        {children}
      </main>
    </div>
  );
}
