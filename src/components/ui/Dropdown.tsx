import React, { useState, useRef } from 'react';
import './Dropdown.css';

export interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface DropdownProps {
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
    value,
    options,
    onChange,
    placeholder = 'Select...',
    className = '',
    icon,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const toggleOpen = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    // Close on click outside is handled by the backdrop div when open,
    // but we can also use ref detection for robustness if needed.
    // The backdrop approach is simpler and effective for modals/dropdowns.

    return (
        <div className={`glass-dropdown-container ${className}`} ref={containerRef}>
            {isOpen && (
                <div
                    className="glass-dropdown-backdrop"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className={`glass-dropdown-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={toggleOpen}
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {icon}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedOption ? selectedOption.label : placeholder}
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
                {options.map((option) => (
                    <div
                        key={option.value}
                        className={`glass-dropdown-item ${option.value === value ? 'is-selected' : ''}`}
                        onClick={() => handleSelect(option.value)}
                    >
                        <div className="glass-dropdown-item-check">
                            {option.value === value && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                        {option.icon && <span style={{ marginRight: '0.5rem' }}>{option.icon}</span>}
                        {option.label}
                    </div>
                ))}
                {options.length === 0 && (
                    <div style={{ padding: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.85rem' }}>
                        No options
                    </div>
                )}
            </div>
        </div>
    );
};
