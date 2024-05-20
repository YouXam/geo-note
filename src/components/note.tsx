import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '@/lib/utils';

interface Note {
  id: number;
  content: string;
  date: number;
  latitude: number | null;
  longitude: number | null;
}


const getCurrentPosition = (): Promise<GeolocationPosition['coords']> => {
  return new Promise((resolve, reject) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => {
          console.log(error)
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: Infinity,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.log(error)
      reject(error);
    }
  });
};

export const Note: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const noteRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  const [highlightedNote, setHighlightedNote] = useState<number | null>(null);
  const addNoteRef = useRef<HTMLButtonElement | null>(null);
  const id = useRef<number>(0);

  useEffect(() => {
    const storedNotes = localStorage.getItem('notes');
    if (storedNotes) {
      setNotes(JSON.parse(storedNotes));
    }
    const storedId = localStorage.getItem('id');
    if (storedId) {
      id.current = parseInt(storedId);
    } else {
      id.current = 0;
    }
  }, []);

  const saveNotes = (notes: Note[]) => {
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('id', id.current.toString());
    setNotes(notes);
  };

  const addNote = async () => {
    if (!newNoteContent.trim()) return;
    let position = null;
    try {
      position = await getCurrentPosition();
    } catch (error) {
      console.error(error);
    }
    const newNote: Note = {
      id: ++id.current,
      content: newNoteContent,
      date: new Date().getTime(),
      latitude: position?.latitude || null,
      longitude: position?.longitude || null,
    };

    const updatedNotes = [newNote, ...notes];
    saveNotes(updatedNotes);
    setNewNoteContent('');
    setNewNote(false)
  };


  const editNote = (note: Note) => {
    setEditingNote(note);
  };

  const saveEditNote = () => {
    if (!editingNote) return;

    const updatedNotes = notes.map((note) =>
      note.id === editingNote.id ? { ...note, content: editingNote.content } : note
    );
    saveNotes(updatedNotes);
    setEditingNote(null);
  };

  const deleteNote = (id: number) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    saveNotes(updatedNotes);
  };

  const exportNotes = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      notes,
      id: id.current,
    }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'notes.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importNotes = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { notes: importedNotes, id: importedId } = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedNotes) && typeof importedId === 'number') {
            id.current = importedId;
            saveNotes(importedNotes);
          }
        } catch (error) {
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  }

  const scrollToNote = (id: number) => {
    noteRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    setHighlightedNote(id);
    setTimeout(() => setHighlightedNote(null), 1000);
  };

  return (
    <div className="flex flex-col">
      <header className="py-4 px-6 flex items-center justify-between shadow-md z-10">
        <h1 className="text-2xl font-bold">Geo Note</h1>
        <div className='space-x-2'>
          <Button variant="outline" onClick={exportNotes}>
            <ExportIcon className="w-5 h-5 md:mr-2" />
            <span className='hidden md:block'>Export Notes</span>
          </Button>
          <Button variant="outline" onClick={importNotes}>
            <ImportIcon className="w-5 h-5 md:mr-2" />
            <span className='hidden md:block'>Import Notes</span>
          </Button>
        </div>
      </header>
      <div>
        <Mapview notes={notes} onNoteClick={scrollToNote} />
      </div>
      <main className="flex-1 overflow-auto p-6">
        <div className="grid gap-6">
          <div className='grid grid-cols-1 md:flex justify-end items-end'>
            <Button variant="default" ref={addNoteRef} onClick={() => {
              setNewNote(true)
              const addNoteTop = addNoteRef.current?.getBoundingClientRect().top
              if (addNoteTop && addNoteTop > window.innerHeight - 230) {
                addNoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}>
              <PlusIcon className="w-4 h-4 mr-1" />
              New Note
            </Button>
          </div>
          {newNote && <div className="grid w-full gap-2">
            <Textarea
              rows={Math.max(5, newNoteContent.split('\n').length + 1)}
              value={newNoteContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNoteContent(e.target.value)}
              placeholder="Type your new note here..."
            />
            <div className='grid grid-cols-2 gap-2 md:flex md:justify-end'>
              <Button onClick={addNote} variant={"default"}>
                <SaveIcon className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => {
                setNewNote(false)
                setNewNoteContent('')
              }} variant={"outline"}>
                <CancelIcon className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>}
          <div className="grid gap-4">
            {notes.map((note) => (
              <Card className={cn(
                "p-4 flex flex-col gap-2 group",
                {
                  'bg-gray-100 dark:bg-gray-800': highlightedNote === note.id,
                  'bg-white dark:bg-gray-900': highlightedNote !== note.id,
                }
              )} key={note.id} ref={(el) => noteRefs.current[note.id] = el}>
                <div className="grid grid-cols-1 space-y-2 md:flex md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <NotebookIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium">Note #{note.id}</span>
                  </div>
                  <div className="md:flex md:space-x-4">
                    {note.latitude && note.longitude && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <LocateIcon className="w-4 h-4" />
                        <span className='select-all'>{note.latitude?.toFixed(6)}, {note.longitude?.toFixed(6)}</span>
                      </div>)}
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <CalendarDaysIcon className="w-4 h-4" />
                      <span>{new Date(note.date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {editingNote && editingNote.id === note.id ? (
                  <Textarea
                    rows={editingNote.content.split('\n').length + 1}
                    value={editingNote.content}
                    className='my-2'
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingNote({ ...editingNote, content: e.target.value })}
                  />
                ) : (
                  <pre className='text-gray-500 dark:text-gray-400 pt-2 font-sans whitespace-pre-wrap'>
                    {note.content ? note.content : <span className="italic">Empty note</span>}
                  </pre>
                )}
                <div className="mt-2 flex items-center justify-end gap-2">
                  {editingNote && editingNote.id === note.id ? (
                    <Button size="sm" onClick={saveEditNote}>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => editNote(note)}>
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {editingNote && editingNote.id === note.id ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingNote(null)}>
                      <CancelIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  ) : (
                    <Button size="sm" variant={"destructive"} onClick={() => deleteNote(note.id)}>
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {notes.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 my-24">
                No notes found. Click on "New Note" to add a new note.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const CenterControl = ({ getCenter }: { getCenter: () => Promise<L.LatLngExpression> }) => {
  const map = useMap();

  const handleClick = async () => {
    map.setView(await getCenter(), 17);
  };

  // @ts-expect-error - Leaflet Control
  L.Control.CenterButton = L.Control.extend({
    onAdd: function () {
      const btn = L.DomUtil.create('button', 'leaflet-bar');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="h-4" style="padding: 0px 0px">
          <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
        </svg>`;
      btn.style.backgroundColor = 'white';
      btn.style.border = '2px solid rgba(0,0,0,0.2)';
      btn.style.cursor = 'pointer';
      btn.style.padding = '5px 6px';

      btn.onclick = handleClick;

      return btn;
    },
    onRemove: function () {
    }
  });

  // @ts-expect-error - Leaflet Control
  L.control.centerButton = function (opts) {
    // @ts-expect-error - Leaflet Control
    return new L.Control.CenterButton(opts);
  }

  useEffect(() => {
    // @ts-expect-error - Leaflet Control
    const control = L.control.centerButton({ position: 'topleft' }).addTo(map);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
};

function Mapview({ notes, onNoteClick }: { notes: Note[], onNoteClick: (id: number) => void }) {
  const [c, setC] = useState<GeolocationCoordinates | null>(null);
  const [e, setE] = useState<Error | null>(null);
  async function updateLocation() {
    try {
      const position = await getCurrentPosition();
      setC(position);
    } catch (error) {
      setE(error as Error);
    }
  }
  useEffect(() => {
    updateLocation();
  }, []);
  if (e) {
    return <div>Error: {e.message}</div>
  }
  if (!c) {
    return <div className='flex items-center justify-center h-96 md:h-[70vh]'>
      Loading...
    </div>
  }
  const center = [c.latitude, c.longitude] as L.LatLngExpression;
  return (
    <MapContainer center={center} zoom={17} className="h-96 md:h-[70vh]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CenterControl getCenter={async () => {
        const position = await getCurrentPosition();
        return [position.latitude, position.longitude];
      }}/>
      {notes.map((note) => (
        note.latitude && note.longitude &&
        <Marker
          key={note.id}
          position={[note.latitude, note.longitude]}
          icon={L.divIcon({
            className: 'custom-icon',
            html: `
              <div class="marker-container">
                <img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" class="marker-icon" />
                <img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png" class="marker-shadow" />
                <div class="marker-id" onclick="handleNoteClick(${note.id})">${note.id}</div>
              </div>
            `,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -40],
          })}
        >
          <Popup>
            <div className='max-w-[150px]'>
              <strong onClick={() => onNoteClick(note.id)} className="cursor-pointer underline text-blue-500 dark:text-blue-300 block mb-1">
                Note #{note.id}
              </strong>
              <p style={{ margin: 0 }}>
                {note.content.length > 20 ? `${note.content.substring(0, 20)}...` : note.content}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>)
}


function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l2 2h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2z" />
      <line x1="17" x2="17" y1="21" y2="8" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function CancelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  )
}


function CalendarDaysIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  )
}

function ImportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <path d="M128 64c0-35.3 28.7-64 64-64H352V128c0 17.7 14.3 32 32 32H512V448c0 35.3-28.7 64-64 64H192c-35.3 0-64-28.7-64-64V336H302.1l-39 39c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l39 39H128V64zm0 224v48H24c-13.3 0-24-10.7-24-24s10.7-24 24-24H128zM512 128H384V0L512 128z" />
    </svg>
  )
}


function ExportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
      <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V288H216c-13.3 0-24 10.7-24 24s10.7 24 24 24H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zM384 336V288H494.1l-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39H384zm0-208H256V0L384 128z" />
    </svg>
  )
}


function LocateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" x2="5" y1="12" y2="12" />
      <line x1="19" x2="22" y1="12" y2="12" />
      <line x1="12" x2="12" y1="2" y2="5" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  )
}


function NotebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6h4" />
      <path d="M2 10h4" />
      <path d="M2 14h4" />
      <path d="M2 18h4" />
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M16 2v20" />
    </svg>
  )
}


function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}


function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}


function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}
