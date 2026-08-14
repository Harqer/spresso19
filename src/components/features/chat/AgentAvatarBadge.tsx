import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

interface AgentAvatarBadgeProps {
  icon: string;
  color: string;
  isSelected: boolean;
  badge: string;
}

export const AgentAvatarBadge: React.FC<AgentAvatarBadgeProps> = ({ icon, color, isSelected, badge }) => (
  <div className="flex items-center justify-between mb-2">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isSelected ? "bg-white shadow-2xs" : "bg-[#f2f6f3]"}`}>
      <MaterialIcon icon={icon} size={18} className={color} />
    </div>
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isSelected ? "bg-white/80 text-[#18211e]" : "bg-neutral-100 text-neutral-600"}`}>
      {badge}
    </span>
  </div>
);
