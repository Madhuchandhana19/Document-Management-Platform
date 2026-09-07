package com.dms.exception;

public class InvalidPhoneException extends RuntimeException {
    public InvalidPhoneException() {
        super();
    }

    public InvalidPhoneException(String message) {
        super(message);
    }
}
