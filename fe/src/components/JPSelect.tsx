import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './JPSelect.css';

export type JPOption = { label: string; value: string };

type JPSelectProps = {
  value: string;
  onChange: (v: string) => void;
  options: JPOption[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

export default function JPSelect({
  value,
  onChange,
  options,
  className,
  placeholder = '선택',
  disabled,
}: JPSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      {/* 트리거 (닫힌 상태) */}
      <Select.Trigger
        aria-label="선택"
        className={`jp-select-trigger ${className || ''}`}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>

      {/* 드롭다운 포털 */}
      <Select.Portal>
        <Select.Content
          className="jp-select-content"
          align="start"
          sideOffset={6}
          position="popper"
        >
          {/* 위쪽 스크롤 버튼 */}
          <Select.ScrollUpButton className="jp-select-scroll-button">
            <ChevronUp size={16} />
          </Select.ScrollUpButton>

          {/* 옵션들이 들어갈 뷰포트 */}
          <Select.Viewport className="jp-select-viewport">
            {options.map(opt => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="jp-select-item"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>

          {/* 아래쪽 스크롤 버튼 */}
          <Select.ScrollDownButton className="jp-select-scroll-button">
            <ChevronDown size={16} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}