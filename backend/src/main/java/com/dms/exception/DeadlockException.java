package com.dms.exception;

public class DeadlockException extends RuntimeException {
    public DeadlockException(String message) {
        super(message);
    }
}
