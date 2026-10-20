CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE vacation_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_days INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(250) NOT NULL,
    admin_comment VARCHAR(500),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_vacation_requests_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_vacation_requests_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (id),
    CONSTRAINT ck_vacation_requests_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT ck_vacation_requests_dates
        CHECK (end_date >= start_date),
    CONSTRAINT ck_vacation_requests_working_days
        CHECK (working_days >= 0),
    CONSTRAINT ex_vacation_requests_no_overlap
        EXCLUDE USING gist (
            user_id WITH =,
            daterange(start_date, end_date, '[]') WITH &&
        ) WHERE (status IN ('PENDING', 'APPROVED'))
);

CREATE INDEX idx_vacation_requests_user ON vacation_requests (user_id);
CREATE INDEX idx_vacation_requests_status ON vacation_requests (status);
