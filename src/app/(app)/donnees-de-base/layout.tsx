import { MasterDataSubnav } from "@/components/gmao/master-data-subnav";

export default function MasterDataLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gmao-module-page density-page-inner space-y-3">
      <MasterDataSubnav />
      {children}
    </div>
  );
}
