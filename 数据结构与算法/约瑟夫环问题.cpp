//约瑟夫环问题

/*
 约瑟夫环是一个数学应用问题，已知n个人（以编号1，2，3...n)分别表示，
 围坐在一张圆桌周围，以编号为k的人开始报数，数到m的那个人出列；
 他的下一个人又从1开始报数，数到m的那个人出列，依此规律重复下去
 直到圆桌周围的人全部出列，输出人的出列顺序
*/

//这里不用数组 因为删除元素还需要移动其他元素 太麻烦
//以不带头节点的单向循环链表为例

#include<iostream>

using namespace std;

struct Node{
    int data_;
    Node *next_;
    Node(int data = 0):data_(data),next_(nullptr){}
};

//构造不带头结点的单向循环链表：1 -> 2 -> ... -> n -> 1
Node* createList(int n){
    Node *head = nullptr;
    Node *tail = nullptr;
    for (int i = 1; i <= n; i++){
        Node *node = new Node(i);
        if (head == nullptr){
            head = node;
        } else {
            tail->next_ = node;
        }
        tail = node;
    }
    if (tail != nullptr){
        tail->next_ = head;  //成环
    }
    return head;
}

void Joseph(Node *head_, int k, int m){
    Node *p = head_;
    Node *q = head_;
    //先让q指向最后一个节点（head_的前驱），这样k=1时q也是p的前驱
    while (q->next_ != head_){
        q = q->next_;
    }
    //从第k个开始报数
    //注意这里是没有头节点的，所以i应该从1开始
    for (int i = 1; i < k ; i++){
        q = p;
        p = p->next_;
    }
    //此时p指针指向第k个人
    //当p == q，算法就结束了
    for (;;){
        for (int i = 1 ; i < m; i++){
            q = p;
            p = p->next_;
        }
        cout << p->data_ << " ";
        //删除从k数的第m个节点
        q->next_ = p->next_;
        delete p;
        p = q->next_;
        //只剩一个人时输出并结束
        if (p == q){
            cout << p->data_ << " ";
            delete p;
            break;
        }
    }
}

int main(){
    int n, k, m;
    cout << "请输入人数 n、起始编号 k、报数 m：";
    cin >> n >> k >> m;
    Node *head = createList(n);
    cout << "出列顺序：";
    Joseph(head, k, m);
    cout << endl;
    return 0;
}
