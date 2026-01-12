# ==============================================================================
# File Watcher Service - Monitor directories for new documents
# ==============================================================================

import os
import time
from pathlib import Path
from typing import Callable, Optional, Set
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent
from loguru import logger
from threading import Thread
import queue

from config import get_settings


class DocumentEventHandler(FileSystemEventHandler):
    """
    Handler for file system events on documents.
    Queues files for processing when created or modified.
    """
    
    def __init__(
        self,
        on_file_ready: Callable[[str], None],
        supported_extensions: Set[str]
    ):
        super().__init__()
        self.on_file_ready = on_file_ready
        self.supported_extensions = supported_extensions
        self._pending_files: queue.Queue = queue.Queue()
        self._debounce_seconds = 2.0
        
        self._processor_thread = Thread(target=self._process_pending, daemon=True)
        self._processor_thread.start()
    
    def _is_supported(self, path: str) -> bool:
        ext = Path(path).suffix.lower()
        return ext in self.supported_extensions
    
    def _process_pending(self):
        pending: dict = {}
        
        while True:
            try:
                try:
                    path = self._pending_files.get_nowait()
                    pending[path] = time.time()
                except queue.Empty:
                    pass
                
                now = time.time()
                ready = [p for p, t in pending.items() if now - t >= self._debounce_seconds]
                
                for path in ready:
                    del pending[path]
                    if os.path.exists(path):
                        try:
                            self.on_file_ready(path)
                        except Exception as e:
                            logger.error(f"Error processing {path}: {e}")
                
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Pending processor error: {e}")
                time.sleep(1)
    
    def on_created(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._is_supported(event.src_path):
            logger.info(f"File created: {event.src_path}")
            self._pending_files.put(event.src_path)
    
    def on_modified(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._is_supported(event.src_path):
            self._pending_files.put(event.src_path)
    
    def on_deleted(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._is_supported(event.src_path):
            logger.info(f"File deleted: {event.src_path}")


class FileWatcher:
    def __init__(self, on_file_ready: Callable[[str], None]):
        self.settings = get_settings()
        self.on_file_ready = on_file_ready
        self.supported_extensions = set(self.settings.supported_extensions)
        self._observer: Optional[Observer] = None
        self._watching = False
    
    def start(self, path: Optional[str] = None):
        watch_path = path or self.settings.documents_path
        
        if not os.path.exists(watch_path):
            logger.error(f"Watch path does not exist: {watch_path}")
            return
        
        handler = DocumentEventHandler(
            on_file_ready=self.on_file_ready,
            supported_extensions=self.supported_extensions
        )
        
        self._observer = Observer()
        self._observer.schedule(handler, watch_path, recursive=True)
        self._observer.start()
        self._watching = True
        logger.info(f"Started watching: {watch_path}")
    
    def stop(self):
        if self._observer:
            self._observer.stop()
            self._observer.join()
            self._observer = None
            self._watching = False
            logger.info("Stopped file watcher")
    
    @property
    def is_watching(self) -> bool:
        return self._watching
    
    def scan_existing(self, path: Optional[str] = None) -> int:
        scan_path = Path(path or self.settings.documents_path)
        
        if not scan_path.exists():
            return 0
        
        count = 0
        for ext in self.supported_extensions:
            for file_path in scan_path.rglob(f"*{ext}"):
                self.on_file_ready(str(file_path))
                count += 1
        
        logger.info(f"Found {count} existing files to index")
        return count
