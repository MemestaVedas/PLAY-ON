/**
 * Profile Settings Modal Component
 * 
 * A modal popup for editing AniList profile settings:
 * - Bio/About text
 * - Title language preference
 * - Staff name language preference
 * - Adult content toggle
 * - Score format preference
 * - Profile color (theme)
 * - Timezone
 * - Activity merge time
 * - Airing notifications
 * 
 * Includes unsaved changes confirmation dialog.
 */

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import {
    updateUserProfile,
    TitleLanguage,
    StaffNameLanguage,
    ScoreFormat
} from '../../api/anilistClient';
import { Dropdown } from '../ui/Dropdown';
import { CheckIcon, SettingsIcon, UserIcon, LinkIcon } from '../ui/Icons';

// Dropdown options
const TITLE_LANGUAGE_OPTIONS = [
    { value: 'ROMAJI', label: 'Romaji' },
    { value: 'ENGLISH', label: 'English' },
    { value: 'NATIVE', label: 'Native' },
    { value: 'ROMAJI_STYLISED', label: 'Romaji (Stylised)' },
    { value: 'ENGLISH_STYLISED', label: 'English (Stylised)' },
    { value: 'NATIVE_STYLISED', label: 'Native (Stylised)' },
];

const STAFF_NAME_LANGUAGE_OPTIONS = [
    { value: 'ROMAJI_WESTERN', label: 'Romaji (Western Order)' },
    { value: 'ROMAJI', label: 'Romaji' },
    { value: 'NATIVE', label: 'Native' },
];

const SCORE_FORMAT_OPTIONS = [
    { value: 'POINT_100', label: '100 Point' },
    { value: 'POINT_10_DECIMAL', label: '10 Point Decimal' },
    { value: 'POINT_10', label: '10 Point' },
    { value: 'POINT_5', label: '5 Star' },
    { value: 'POINT_3', label: '3 Point Smiley' },
];

// AniList profile color options
const PROFILE_COLOR_OPTIONS = [
    { value: 'blue', label: 'Blue', color: '#3DB4F2' },
    { value: 'purple', label: 'Purple', color: '#C063FF' },
    { value: 'pink', label: 'Pink', color: '#FC9DD6' },
    { value: 'orange', label: 'Orange', color: '#EF881A' },
    { value: 'red', label: 'Red', color: '#E13333' },
    { value: 'green', label: 'Green', color: '#4CCA51' },
    { value: 'gray', label: 'Gray', color: '#677B94' },
];

// Activity merge time options (in minutes)
const ACTIVITY_MERGE_OPTIONS = [
    { value: 0, label: 'Never' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '24 hours' },
];

// Common timezones
const TIMEZONE_OPTIONS = [
    { value: '', label: 'Auto (Browser)' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Chicago', label: 'Central Time (US)' },
    { value: 'America/Denver', label: 'Mountain Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'Europe/London', label: 'London (UK)' },
    { value: 'Europe/Paris', label: 'Paris (Europe)' },
    { value: 'Europe/Berlin', label: 'Berlin (Europe)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (China)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (Australia)' },
];

// Props for the modal
interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Unsaved changes confirmation dialog
interface ConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmDialog({ isOpen, onConfirm, onCancel }: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
            <div
                className="w-full max-w-md rounded-2xl p-6"
                style={{
                    background: 'linear-gradient(180deg, rgba(40, 40, 50, 0.98) 0%, rgba(30, 30, 40, 0.98) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <h3 className="text-xl font-bold text-white mb-2">Unsaved Changes</h3>
                <p className="text-white/60 mb-6">
                    You have unsaved changes. Are you sure you want to discard them?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white/80 transition-all hover:bg-white/10"
                        style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                        Keep Editing
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all"
                        style={{ background: '#ef4444' }}
                    >
                        Discard Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, refreshUser } = useAuthContext();

    // Form state
    const [about, setAbout] = useState('');
    const [titleLanguage, setTitleLanguage] = useState<TitleLanguage>('ROMAJI');
    const [staffNameLanguage, setStaffNameLanguage] = useState<StaffNameLanguage>('ROMAJI_WESTERN');
    const [displayAdultContent, setDisplayAdultContent] = useState(false);
    const [scoreFormat, setScoreFormat] = useState<ScoreFormat>('POINT_100');
    const [profileColor, setProfileColor] = useState('blue');
    const [timezone, setTimezone] = useState('');
    const [activityMergeTime, setActivityMergeTime] = useState(0);
    const [airingNotifications, setAiringNotifications] = useState(true);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Initialize form with user data when modal opens
    useEffect(() => {
        if (isOpen && user) {
            setAbout(user.about || '');
            setTitleLanguage((user.options?.titleLanguage as TitleLanguage) || 'ROMAJI');
            setStaffNameLanguage((user.options?.staffNameLanguage as StaffNameLanguage) || 'ROMAJI_WESTERN');
            setDisplayAdultContent(user.options?.displayAdultContent || false);
            setScoreFormat((user.mediaListOptions?.scoreFormat as ScoreFormat) || 'POINT_100');
            setProfileColor(user.options?.profileColor || 'blue');
            setTimezone(user.options?.timezone || '');
            setActivityMergeTime(user.options?.activityMergeTime || 0);
            setAiringNotifications(user.options?.airingNotifications ?? true);
            setHasChanges(false);
            setError(null);
        }
    }, [isOpen, user]);

    // Track changes
    const updateField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
        setter(value);
        setHasChanges(true);
    };

    // Handle close with unsaved changes check
    const handleClose = () => {
        if (hasChanges) {
            setShowConfirmDialog(true);
        } else {
            onClose();
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await updateUserProfile({
                about,
                titleLanguage,
                staffNameLanguage,
                displayAdultContent,
                scoreFormat,
                profileColor,
                timezone: timezone || undefined,
                activityMergeTime,
                airingNotifications,
            });

            await refreshUser();
            setHasChanges(false);
            onClose();
        } catch (err) {
            console.error('Failed to update profile:', err);
            setError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const openAniListProfile = () => {
        window.open('https://anilist.co/settings/account', '_blank');
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
                onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
                <div
                    className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-8"
                    style={{
                        background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {user?.avatar?.large && (
                                <img
                                    src={user.avatar.large}
                                    alt={user.name}
                                    className="w-12 h-12 rounded-xl object-cover"
                                />
                            )}
                            <div>
                                <h2 className="text-2xl font-black text-white">Edit Profile</h2>
                                <p className="text-sm text-white/40">{user?.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Quick Link to AniList for Avatar/Banner */}
                    <button
                        onClick={openAniListProfile}
                        className="w-full flex items-center gap-3 p-4 rounded-xl mb-6 transition-all"
                        style={{
                            background: 'rgba(59, 180, 242, 0.1)',
                            border: '1px solid rgba(59, 180, 242, 0.2)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 180, 242, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 180, 242, 0.1)';
                        }}
                    >
                        <LinkIcon size={20} className="text-[#3DB4F2]" />
                        <div className="flex-1 text-left">
                            <div className="text-white font-medium">Change Avatar & Banner</div>
                            <div className="text-sm text-white/40">Opens AniList in your browser</div>
                        </div>
                        <span className="text-[#3DB4F2] text-sm font-medium">→</span>
                    </button>

                    {/* Bio Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-white/60 mb-2">About / Bio</label>
                        <textarea
                            value={about}
                            onChange={(e) => updateField(setAbout, e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={4}
                            className="w-full p-4 rounded-xl text-white placeholder-white/30 resize-vertical"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                minHeight: '100px',
                            }}
                        />
                        <p className="mt-2 text-xs text-white/40">Supports Markdown formatting</p>
                    </div>

                    {/* Profile Color */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-white/60 mb-3">Profile Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {PROFILE_COLOR_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateField(setProfileColor, option.value)}
                                    className={`w-10 h-10 rounded-xl transition-all ${profileColor === option.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1e28] scale-110' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: option.color }}
                                    title={option.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Display Preferences */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Display Preferences</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">Title Language</div>
                                    <div className="text-sm text-white/40">Preferred language for titles</div>
                                </div>
                                <Dropdown
                                    value={titleLanguage}
                                    options={TITLE_LANGUAGE_OPTIONS}
                                    onChange={(val) => updateField(setTitleLanguage, val as TitleLanguage)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">Staff Name Language</div>
                                    <div className="text-sm text-white/40">Preferred name order</div>
                                </div>
                                <Dropdown
                                    value={staffNameLanguage}
                                    options={STAFF_NAME_LANGUAGE_OPTIONS}
                                    onChange={(val) => updateField(setStaffNameLanguage, val as StaffNameLanguage)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">Scoring System</div>
                                    <div className="text-sm text-white/40">How you rate anime/manga</div>
                                </div>
                                <Dropdown
                                    value={scoreFormat}
                                    options={SCORE_FORMAT_OPTIONS}
                                    onChange={(val) => updateField(setScoreFormat, val as ScoreFormat)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">Timezone</div>
                                    <div className="text-sm text-white/40">For airing schedules</div>
                                </div>
                                <Dropdown
                                    value={timezone}
                                    options={TIMEZONE_OPTIONS}
                                    onChange={(val) => updateField(setTimezone, val)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Settings */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Activity</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">Activity Merge Time</div>
                                    <div className="text-sm text-white/40">Combine activities within this time</div>
                                </div>
                                <Dropdown
                                    value={String(activityMergeTime)}
                                    options={ACTIVITY_MERGE_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
                                    onChange={(val) => updateField(setActivityMergeTime, parseInt(val))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">Airing Notifications</div>
                                    <div className="text-sm text-white/40">Get notified when episodes air</div>
                                </div>
                                <button
                                    className={`w-14 h-8 rounded-full transition-all duration-300 ${airingNotifications ? 'bg-[var(--color-zen-accent)]' : 'bg-white/10'}`}
                                    onClick={() => updateField(setAiringNotifications, !airingNotifications)}
                                >
                                    <div
                                        className={`w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 ${airingNotifications ? 'translate-x-7' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Settings */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Content</h3>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white font-medium">Show Adult Content</div>
                                <div className="text-sm text-white/40">Display 18+ content in search</div>
                            </div>
                            <button
                                className={`w-14 h-8 rounded-full transition-all duration-300 ${displayAdultContent ? 'bg-[var(--color-zen-accent)]' : 'bg-white/10'}`}
                                onClick={() => updateField(setDisplayAdultContent, !displayAdultContent)}
                            >
                                <div
                                    className={`w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 ${displayAdultContent ? 'translate-x-7' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 px-6 rounded-xl font-bold text-white/60 transition-all hover:bg-white/5"
                            style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanges}
                            className="flex-1 py-3 px-6 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2"
                            style={{
                                background: hasChanges ? 'var(--color-zen-accent)' : 'rgba(255, 255, 255, 0.1)',
                                color: hasChanges ? '#000' : 'rgba(255, 255, 255, 0.4)',
                                opacity: isSaving ? 0.6 : 1,
                            }}
                        >
                            {isSaving ? (
                                'Saving...'
                            ) : (
                                <>
                                    <CheckIcon size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Unsaved Changes Confirmation */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onConfirm={() => {
                    setShowConfirmDialog(false);
                    setHasChanges(false);
                    onClose();
                }}
                onCancel={() => setShowConfirmDialog(false)}
            />
        </>
    );
};

// Button component to open the profile settings modal
interface ProfileSettingsButtonProps {
    onClick: () => void;
}

export const ProfileSettingsButton: React.FC<ProfileSettingsButtonProps> = ({ onClick }) => {
    const { user, isAuthenticated } = useAuthContext();

    if (!isAuthenticated) return null;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 w-full p-4 rounded-xl transition-all duration-200"
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
        >
            {user?.avatar?.large ? (
                <img
                    src={user.avatar.large}
                    alt={user.name}
                    className="w-10 h-10 rounded-xl object-cover"
                />
            ) : (
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <UserIcon size={20} />
                </div>
            )}
            <div className="flex-1 text-left">
                <div className="text-white font-bold">{user?.name}</div>
                <div className="text-sm text-white/40">Edit Profile Settings</div>
            </div>
            <SettingsIcon size={20} className="text-white/40" />
        </button>
    );
};

export default ProfileSettingsModal;
