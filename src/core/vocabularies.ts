enum Namespaces {
    SHAPETREE = 'http://www.w3.org/ns/shapetree#',
    LDP = 'http://www.w3.org/ns/ldp#'
}

// I'd like to know if we can disable this rule only or move to other method like this:
// https://github.com/solid/community-server/blob/master/src/util/Vocabularies.ts
enum LdpVocabulary {
    // @ts-ignore
    CONTAINER = `${Namespaces.LDP}Container`,
    // @ts-ignore
    BASIC_CONTAINER = `${Namespaces.LDP}BasicContainer`
}

export { LdpVocabulary };
