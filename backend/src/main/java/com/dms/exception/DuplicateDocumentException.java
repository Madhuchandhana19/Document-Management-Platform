package com.dms.exception;

public class DuplicateDocumentException extends RuntimeException {
    public DuplicateDocumentException() {
        super();
    }

    public DuplicateDocumentException(String message) {
        super(message);
    }
}
