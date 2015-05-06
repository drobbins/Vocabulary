# Create a table for each of the core entities.
CREATE TABLE categories             (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));
CREATE TABLE anatomic_sites         (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));
CREATE TABLE diagnoses              (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));
CREATE TABLE diagnosis_modifiers    (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));
CREATE TABLE subsites               (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));

# The master relationship table links a set of the core entities, and roughly
# represents arow in the tabular form of the vocabulary.
CREATE TABLE dis_relationship_master (
    ID                      VARCHAR(36) NOT NULL PRIMARY KEY,
    CATEGORY_ID             VARCHAR(36) NOT NULL, FOREIGN KEY(CATEGORY_ID)              REFERENCES categories (id),
    ANATOMIC_SITE_ID        VARCHAR(36) NOT NULL, FOREIGN KEY(ANATOMIC_SITE_ID)         REFERENCES anatomic_sites (id),
    ANATOMIC_SUBSITE_ID     VARCHAR(36) NOT NULL, FOREIGN KEY(ANATOMIC_SUBSITE_ID)      REFERENCES subsites (id),
    DIAGNOSIS_ID            VARCHAR(36) NOT NULL, FOREIGN KEY(DIAGNOSIS_ID)             REFERENCES diagnoses (id),
    DIAGNOSIS_MODIFIER_ID   VARCHAR(36) NOT NULL, FOREIGN KEY(DIAGNOSIS_MODIFIER_ID)    REFERENCES diagnosis_modifiers (id)
);

# The site-subsite relationship table relates subsites to their corresponding site.
CREATE TABLE dis_relationship_site_to_subsite (
    ANATOMIC_SITE_ID        VARCHAR(36) NOT NULL, FOREIGN KEY(ANATOMIC_SITE_ID)    REFERENCES anatomic_sites (id),
    ANATOMIC_SUBSITE_ID     VARCHAR(36) NOT NULL, FOREIGN KEY(ANATOMIC_SUBSITE_ID) REFERENCES subsites (id)
);

# The diagnosis/modifer relationship table relates diagnosis modifiers to their corresponding diagnoses.
CREATE TABLE dis_relationship_diagnosis_to_diagnosis_modifier (
    DIAGNOSIS_ID            VARCHAR(36) NOT NULL, FOREIGN KEY(DIAGNOSIS_ID)             REFERENCES diagnoses (id),
    DIAGNOSIS_MODIFIER_ID   VARCHAR(36) NOT NULL, FOREIGN KEY(DIAGNOSIS_MODIFIER_ID)    REFERENCES diagnosis_modifiers (id)
);

# The X0 id's are reserved for (ANY) values.
INSERT INTO anatomic_sites      VALUES ('S0',  '(ANY)');
INSERT INTO subsites            VALUES ('SS0', '(ANY)');
INSERT INTO categories          VALUES ('C0',  '(ANY)');
INSERT INTO diagnoses           VALUES ('D0',  '(ANY)');
INSERT INTO diagnosis_modifiers VALUES ('DM0', '(ANY)');

# These would typically be generated after inserting all the data, but there 
# is little enough data here to make the performance gain negligible.
CREATE INDEX category_descriptions              ON categories (description);
CREATE INDEX anatomic_site_descriptions         ON anatomic_sites (description);
CREATE INDEX diagnosis_descriptions             ON diagnoses (description);
CREATE INDEX diagnosis_modifier_descriptions    ON diagnosis_modifiers (description);
CREATE INDEX subsite_descriptions               ON subsites (description);

## End of Schema ##