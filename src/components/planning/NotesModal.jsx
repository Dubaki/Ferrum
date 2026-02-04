import React, { useState, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Plus, Trash2 } from 'lucide-react';

function migrateNotes(notes) {
    if (!notes) return [];
    if (typeof notes === 'string' && notes.trim()) {
        return [{ id: crypto.randomUUID(), title: 'Заметка', text: notes, createdAt: Date.now() }];
    }
    if (Array.isArray(notes)) return notes;
    return [];
}

const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const NoteListItem = memo(function NoteListItem({ note, isSelected, onSelect }) {
    return (
        <button
            onClick={() => onSelect(note.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isSelected
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'hover:bg-slate-100 text-slate-700'
            }`}
        >
            <div className="truncate">{note.title || 'Без названия'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(note.createdAt)}</div>
        </button>
    );
});

export default function NotesModal({ order, actions, onClose }) {
    const [notesList, setNotesList] = useState(() => migrateNotes(order.notes));
    const [selectedId, setSelectedId] = useState(() => {
        const migrated = migrateNotes(order.notes);
        return migrated[0]?.id || null;
    });
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');

    // Sync local fields when selection changes
    const selectNote = useCallback((id) => {
        setSelectedId(id);
        setNotesList(prev => {
            const note = prev.find(n => n.id === id);
            if (note) {
                setTitle(note.title);
                setText(note.text);
            }
            return prev;
        });
    }, []);

    // Init local fields on first render
    useState(() => {
        const migrated = migrateNotes(order.notes);
        if (migrated[0]) {
            setTitle(migrated[0].title);
            setText(migrated[0].text);
        }
    });

    const saveAll = useCallback(async (list) => {
        setSaving(true);
        try {
            await actions.updateOrder(order.id, 'notes', list);
        } finally {
            setSaving(false);
        }
    }, [actions, order.id]);

    const createNote = useCallback(() => {
        const newNote = {
            id: crypto.randomUUID(),
            title: 'Новая заметка',
            text: '',
            createdAt: Date.now(),
        };
        setNotesList(prev => [...prev, newNote]);
        setSelectedId(newNote.id);
        setTitle(newNote.title);
        setText(newNote.text);
    }, []);

    const handleSave = useCallback(async () => {
        const updated = notesList.map(n =>
            n.id === selectedId ? { ...n, title, text } : n
        );
        setNotesList(updated);
        await saveAll(updated);
    }, [notesList, selectedId, title, text, saveAll]);

    const handleDelete = useCallback(async () => {
        const idx = notesList.findIndex(n => n.id === selectedId);
        const updated = notesList.filter(n => n.id !== selectedId);
        setNotesList(updated);
        if (updated.length > 0) {
            const next = updated[Math.min(idx, updated.length - 1)];
            setSelectedId(next.id);
            setTitle(next.title);
            setText(next.text);
        } else {
            setSelectedId(null);
            setTitle('');
            setText('');
        }
        await saveAll(updated);
    }, [notesList, selectedId, saveAll]);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
            <div className="w-full max-w-3xl h-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-slate-800 px-5 py-4 flex justify-between items-center shrink-0">
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">
                        <MessageSquare size={20} /> Заметки — {order.orderNumber}
                    </h4>
                    <button onClick={onClose} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 min-h-0">
                    {/* Left panel — list */}
                    <div className="w-52 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
                        <button
                            onClick={createNote}
                            className="m-3 flex items-center justify-center gap-1.5 bg-slate-800 text-white text-sm font-semibold py-2 rounded-xl hover:bg-slate-700 transition-colors"
                        >
                            <Plus size={16} /> Создать
                        </button>
                        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                            {notesList.length === 0 && (
                                <p className="text-xs text-slate-400 text-center mt-6 px-2">Нет заметок. Нажмите «Создать».</p>
                            )}
                            {notesList.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={note.id === selectedId}
                                    onSelect={selectNote}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right panel — editor */}
                    <div className="flex-1 flex flex-col p-5 min-w-0">
                        {selectedId ? (
                            <>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Заголовок заметки"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-blue-500 outline-none transition-colors mb-3"
                                />
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    placeholder="Текст заметки..."
                                    className="w-full flex-1 border-2 border-slate-200 rounded-xl p-4 text-sm resize-none focus:border-blue-500 outline-none transition-colors"
                                />
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5"
                                    >
                                        <Trash2 size={15} /> Удалить
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-slate-400 text-sm">Выберите заметку или создайте новую</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
