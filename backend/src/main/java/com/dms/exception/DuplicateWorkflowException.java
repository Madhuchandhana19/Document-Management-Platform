package com.dms.exception;

public class DuplicateWorkflowException extends RuntimeException {
    public DuplicateWorkflowException(String message) {
        super(message);
    }
}
