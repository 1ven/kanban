import { assert } from 'chai';
import _ from 'lodash';
import shortid from 'shortid';
import { recreateTables } from '../helpers';
import db from 'server/db';
import Board from 'server/models/Board';

const boardId = shortid.generate();
const board2Id = shortid.generate();
const userId = shortid.generate();
const listId = shortid.generate();
const cardId = shortid.generate();

describe('Board', () => {
    beforeEach(() => recreateTables().then(setup));

    describe('update', () => {
        it('should update board and return updated board', () => {
            return Board.update(userId, boardId, { title: 'updated title' })
                .then(board => {
                    assert.property(board, 'link');
                    assert.property(board.activity, 'created_at');
                    delete board.activity.created_at;
                    assert.deepEqual(_.omit(board, ['link']), {
                        id: boardId,
                        title: 'updated title',
                        activity: {
                            id: 1,
                            action: 'Updated',
                            type: 'board',
                            entry: {
                                title: 'updated title',
                                link: '/boards/' + boardId
                            }
                        }
                    });
                });
        });
    });

    describe('drop', () => {
        it('should drop board entry', () => {
            return Board.drop(board2Id)
                .then(() => {
                    return db.query(`SELECT id FROM boards WHERE id = '2'`);
                })
                .then(result => {
                    assert.lengthOf(result, 0);
                });
        });

        it('should return dropped board id', () => {
            return Board.drop(board2Id)
                .then(result => {
                    assert.equal(result.id, board2Id);
                });
        });
    });

    describe('createList', () => {
        const listData = {
            title: 'test list'
        };

        it('should create list', () => {
            return Board.createList(userId, boardId, listData).then(list => {
                assert.property(list, 'id');
                assert.property(list.activity, 'created_at');
                delete list.activity.created_at;
                assert.deepEqual(_.omit(list, ['id']), {
                    title: listData.title,
                    link: '/boards/' + boardId + '/lists/' + list.id,
                    activity: {
                        id: 1,
                        action: 'Created',
                        type: 'list',
                        entry: {
                            title: listData.title,
                            link: '/boards/' + boardId + '/lists/' + list.id
                        }
                    }
                });
            });
        });

        it('should relate list to board', () => {
            return Board.createList(userId, boardId, listData).then(list => {
                return db.one('SELECT board_id FROM boards_lists WHERE list_id = $1', [list.id]);
            }).then(result => {
                assert.equal(result.board_id, boardId);
            });
        });

        it('should generate shortid', () => {
            return Board.createList(userId, boardId, listData).then(list => {
                assert.isTrue(shortid.isValid(list.id));
            });
        });
    });

    describe('find', () => {
        describe('findById', () => {
            it('should return board with nested children', () => {
                return Board.findById(boardId)
                    .then(board => {
                        assert.deepEqual(board, {
                            id: boardId,
                            title: 'test board',
                            link: '/boards/' + boardId,
                            lists: [{
                                id: listId,
                                title: 'test list',
                                link: '/boards/' + boardId + '/lists/' + listId,
                                cards: [{
                                    id: cardId,
                                    text: 'test card',
                                    link: '/boards/' + boardId + '/cards/' + cardId
                                }]
                            }]
                        });
                    });
            });
        });

        describe('findAllByUser', () => {
            it('should return all boards with nested children', () => {
                return Board.findAllByUser(userId)
                    .then(boards => {
                        assert.deepEqual(boards, [{
                            id: boardId,
                            title: 'test board',
                            link: '/boards/' + boardId,
                            lists_length: 1,
                            cards_length: 1,
                            starred: false
                        }]);
                    });
            });
        });
    });

    describe('archive', () => {
        it('should set `archive` flag to true', () => {
            return Board.archive(boardId)
                .then(() => {
                    return db.one(`SELECT archived FROM boards WHERE id = $1`, [boardId]);
                })
                .then(result => {
                    assert.isTrue(result.archived);
                });
        });

        it('should return archived entry id', () => {
            return Board.archive(boardId)
                .then(result => {
                    assert.deepEqual(result, {
                        id: boardId
                    });
                });
        });
    });

    describe('markAsStarred', () => {
        it('should mark board as `starred` and return updated board', () => {
            return Board.markAsStarred(userId, boardId)
                .then(board => {
                    assert.deepEqual(board, {
                        id: boardId,
                        title: 'test board',
                        link: '/boards/' + boardId,
                        lists_length: 1,
                        cards_length: 1,
                        starred: true
                    });
                });
        });

        it('should add corresponding activity', () => {
            return Board.markAsStarred(userId, boardId)
                .then(() => {
                    return db.one(`
                        SELECT EXISTS (
                            SELECT FROM activity WHERE entry_id = $1 AND action = 'Starred'
                        )
                    `, [boardId]);
                })
                .then(result => {
                    assert.isTrue(result.exists);
                });
        });
    });
});

function setup() {
    return db.none(`
        INSERT INTO users(id, username, email, hash, salt)
        VALUES ($5, 'test', 'test@test.com', 'hash', 'salt');
        INSERT INTO boards(id, title) VALUES ($1, 'test board'), ($2, 'test board 2');
        INSERT INTO users_boards VALUES ($5, $1);
        INSERT INTO lists(id, title) VALUES ($3, 'test list');
        INSERT INTO boards_lists VALUES ($1, $3);
        INSERT INTO cards(id, text) VALUES ($4, 'test card');
        INSERT INTO lists_cards VALUES ($3, $4);
    `, [boardId, board2Id, listId, cardId, userId]);
};
