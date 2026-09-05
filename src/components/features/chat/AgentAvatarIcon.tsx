import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

interface AgentAvatarIconProps {
  icon: string;
  color: string;
  isSelected: boolean;
}

export const AgentAvatarIcon: React.FC<AgentAvatarIconProps> = ({ icon, color, isSelected }) => (
  <div className="mb-2">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isSelected ? "bg-white shadow-2xs" : "bg-[#f2f6f3]"}`}>
      <MaterialIcon icon={icon} size={18} className={color} />
    </div>
  </div>
);
