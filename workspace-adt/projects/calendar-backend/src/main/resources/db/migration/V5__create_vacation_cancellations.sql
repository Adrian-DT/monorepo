ALTER TABLE vacation_requests ADD COLUMN parent_vacation_id UUID;

ALTER TABLE vacation_requests
    ADD CONSTRAINT fk_vacation_requests_parent
        FOREIGN KEY (parent_vacation_id) REFERENCES vacation_requests (id);

CREATE TABLE vacation_cancellations (
    id UUID PRIMARY KEY,
    vacation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    requested_by UUID NOT NULL,
    request_reason VARCHAR(500),
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_comment VARCHAR(500),
    original_start_date DATE NOT NULL,
    original_end_date DATE NOT NULL,
    original_working_days INTEGER NOT NULL,
    released_working_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_vacation_cancellations_vacation
        FOREIGN KEY (vacation_id) REFERENCES vacation_requests (id),
    CONSTRAINT fk_vacation_cancellations_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_vacation_cancellations_requested_by
        FOREIGN KEY (requested_by) REFERENCES users (id),
    CONSTRAINT fk_vacation_cancellations_resolved_by
        FOREIGN KEY (resolved_by) REFERENCES users (id),
    CONSTRAINT ck_vacation_cancellations_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    CONSTRAINT ck_vacation_cancellations_dates
        CHECK (to_date >= from_date)
);

CREATE UNIQUE INDEX uk_vacation_cancellations_pending
    ON vacation_cancellations (vacation_id)
    WHERE status = 'PENDING';

CREATE INDEX idx_vacation_cancellations_user
    ON vacation_cancellations (user_id);
