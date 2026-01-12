import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

export interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface CommonProps {
    options: DropdownOption[];
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface SingleProps extends CommonProps {
    multiple?: false;
    value: string;
    onChange: (value: string) => void;
}

interface MultiProps extends CommonProps {
    multiple: true;
    value: string[];
    onChange: (value: string[]) => void;
}

export type DropdownProps = SingleProps | MultiProps;

export const Dropdown: React.FC<DropdownProps> = (props) => {
    const {
        options,
        placeholder = 'Select...',
        className = '',
        icon,
        disabled = false,
        multiple = false
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleOpen = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (optionValue: string) => {
        if (multiple) {
            const currentValues = (props as MultiProps).value || [];
            const newValue = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            (props as MultiProps).onChange(newValue);
        } else {
            (props as SingleProps).onChange(optionValue);
            setIsOpen(false);
        }
    };

    const isSelected = (optionValue: string) => {
        if (multiple) {
            return ((props as MultiProps).value || []).includes(optionValue);
        }
        return (props as SingleProps).value === optionValue;
    };

    const getDisplayLabel = () => {
        if (multiple) {
            const selectedValues = (props as MultiProps).value || [];
            if (selectedValues.length === 0) return placeholder;
            if (selectedValues.length === options.length) return 'All Selected';
            if (selectedValues.length > 2) return `${selectedValues.length} Selected`;
            return selectedValues.map(v => options.find(o => o.value === v)?.label).join(', ');
        } else {
            const val = (props as SingleProps).value;
            const option = options.find(opt => opt.value === val);
            return option ? option.label : placeholder;
        }
    };

    return (
        <div className={`glass-dropdown-container ${className}`} ref={containerRef}>
            <div
                className={`glass-dropdown-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={toggleOpen}
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    {icon}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getDisplayLabel()}
                    </span>
                </div>

                <svg
                    className="glass-dropdown-arrow"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>

            <div className={`glass-dropdown-menu ${isOpen ? 'is-open' : ''}`}>
                {options.map((option) => {
                    const selected = isSelected(option.value);
                    return (
                        <div
                            key={option.value}
                            className={`glass-dropdown-item ${selected ? 'is-selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent closing when clicking item in multi mode? No, handled by click outside logic vs manual close
                                handleSelect(option.value);
                            }}
                        >
                            <div className="glass-dropdown-item-check">
                                {selected && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            {option.icon && <span style={{ marginRight: '0.5rem' }}>{option.icon}</span>}
                            {option.label}
                        </div>
                    );
                })}
                {options.length === 0 && (
                    <div style={{ padding: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.85rem' }}>
                        No options
                    </div>
                )}
            </div>
        </div>
    );
};
