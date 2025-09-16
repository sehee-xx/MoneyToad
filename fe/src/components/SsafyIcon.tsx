import React from 'react';
import SsafyIconSvg from '../../public/SSAFY_icon.svg?react';

interface SsafyIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const SsafyIcon: React.FC<SsafyIconProps> = ({ 
  width = 24, 
  height = 24, 
  className 
}) => {
  return (
    <SsafyIconSvg 
      width={width} 
      height={height} 
      className={className}
    />
  );
};

export default SsafyIcon;